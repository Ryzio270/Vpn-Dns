package com.arcanequest.app.game

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.arcanequest.app.ai.AiClient
import com.arcanequest.app.ai.AiTurn
import com.arcanequest.app.ai.AiTurnParser
import com.arcanequest.app.ai.ChatMessage
import com.arcanequest.app.ai.Prompts
import com.arcanequest.app.data.SaveRepository
import com.arcanequest.app.data.SettingsRepository
import com.arcanequest.app.model.CampaignSave
import com.arcanequest.app.model.CampaignSetup
import com.arcanequest.app.model.CharacterSheet
import com.arcanequest.app.model.DiceRoll
import com.arcanequest.app.model.Item
import com.arcanequest.app.model.JournalEntry
import com.arcanequest.app.model.Perk
import com.arcanequest.app.model.StoryTurn
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class GameUiState(
    val save: CampaignSave? = null,
    val thinking: Boolean = false,
    val error: String? = null,
)

class GameViewModel(app: Application) : AndroidViewModel(app) {

    private val saves = SaveRepository(app)
    private val settings = SettingsRepository(app)

    private val _state = MutableStateFlow(GameUiState())
    val state: StateFlow<GameUiState> = _state

    /** How many past turns are replayed to the model as conversational context. */
    private val historyWindow = 10

    fun loadSlot(slot: Int) {
        val current = _state.value.save
        if (current?.slot == slot) return
        _state.value = GameUiState(save = saves.load(slot))
    }

    fun startNewCampaign(slot: Int, setup: CampaignSetup, character: CharacterSheet) {
        val save = CampaignSave(
            slot = slot,
            setup = setup,
            character = character,
            lastPlayedEpochMs = System.currentTimeMillis(),
        )
        saves.save(save)
        _state.value = GameUiState(save = save)
        requestTurn(save, playerAction = null)
    }

    fun act(action: String) {
        val save = _state.value.save ?: return
        if (_state.value.thinking) return
        requestTurn(save, playerAction = action.trim().ifBlank { null } ?: return)
    }

    private var lastFailedAction: String? = null

    fun retry() {
        val save = _state.value.save ?: return
        if (_state.value.thinking) return
        if (save.turns.isEmpty()) {
            requestTurn(save, playerAction = null)
        } else {
            requestTurn(save, playerAction = lastFailedAction ?: return)
        }
    }

    fun dismissError() {
        _state.value = _state.value.copy(error = null)
    }

    fun toggleEquip(itemId: Long) {
        val save = _state.value.save ?: return
        val target = save.inventory.find { it.id == itemId } ?: return
        val newInventory = save.inventory.map { item ->
            when {
                item.id == itemId -> item.copy(equipped = !item.equipped)
                // Only one weapon and one armor equipped at a time.
                !target.equipped && item.type == target.type &&
                    (target.type == "weapon" || target.type == "armor") -> item.copy(equipped = false)
                else -> item
            }
        }
        persist(save.copy(inventory = newInventory))
    }

    private fun requestTurn(base: CampaignSave, playerAction: String?) {
        _state.value = _state.value.copy(thinking = true, error = null)
        viewModelScope.launch {
            try {
                val turn = withContext(Dispatchers.IO) {
                    val client = AiClient(settings.get())
                    val messages = buildMessages(base, playerAction)
                    AiTurnParser.parse(client.complete(messages))
                }
                lastFailedAction = null
                val updated = applyTurn(base, playerAction, turn)
                persist(updated)
                _state.value = GameUiState(save = updated)
            } catch (e: Exception) {
                lastFailedAction = playerAction
                _state.value = _state.value.copy(
                    thinking = false,
                    error = e.message ?: "The Dungeon Master lost the thread. Check your connection and try again.",
                )
            }
        }
    }

    private fun buildMessages(save: CampaignSave, playerAction: String?): List<ChatMessage> {
        val messages = mutableListOf(ChatMessage("system", Prompts.system(save)))
        save.turns.takeLast(historyWindow).forEach { turn ->
            turn.playerAction?.let { messages.add(ChatMessage("user", it)) }
            messages.add(ChatMessage("assistant", turn.narration))
        }
        messages.add(
            ChatMessage(
                "user",
                if (playerAction == null) Prompts.opening(save) else Prompts.action(playerAction),
            )
        )
        return messages
    }

    private fun applyTurn(save: CampaignSave, playerAction: String?, ai: AiTurn): CampaignSave {
        var nextItemId = save.nextItemId
        val turnIndex = save.turns.size + 1
        val events = mutableListOf<String>()

        // --- Inventory ---
        val inventory = save.inventory.toMutableList()
        ai.inventory_remove.forEach { name ->
            val idx = inventory.indexOfFirst { it.name.equals(name.trim(), ignoreCase = true) }
            if (idx >= 0) {
                val item = inventory[idx]
                if (item.quantity > 1) inventory[idx] = item.copy(quantity = item.quantity - 1)
                else inventory.removeAt(idx)
                events.add("Lost: ${item.name}")
            }
        }
        ai.inventory_add.forEach { add ->
            val existing = inventory.indexOfFirst {
                it.name.equals(add.name, ignoreCase = true) && it.type == normalizeType(add.type)
            }
            if (existing >= 0 && normalizeType(add.type) == "item") {
                val item = inventory[existing]
                inventory[existing] = item.copy(quantity = item.quantity + add.quantity.coerceAtLeast(1))
            } else {
                inventory.add(
                    Item(
                        id = nextItemId++,
                        name = add.name,
                        type = normalizeType(add.type),
                        rarity = add.rarity.lowercase().ifBlank { "common" },
                        description = add.description,
                        damage = add.damage?.takeIf { it.isNotBlank() },
                        armorBonus = add.armor_bonus.coerceIn(0, 20),
                        valueGold = add.value_gold.coerceAtLeast(0),
                        quantity = add.quantity.coerceAtLeast(1),
                    )
                )
            }
            events.add("Acquired: ${add.name}")
        }

        // --- Journal ---
        val journal = save.journal.toMutableList()
        ai.journal_updates.forEach { upd ->
            if (upd.title.isBlank() || upd.entry.isBlank()) return@forEach
            val category = normalizeCategory(upd.category)
            val idx = journal.indexOfFirst { it.title.equals(upd.title, ignoreCase = true) }
            if (idx >= 0) {
                val old = journal[idx]
                if (old.entry == upd.entry) return@forEach
                // The model is told to rewrite the complete article, so replace the
                // text — but if it sent something suspiciously short compared to what
                // we already know, append instead so lore is never lost.
                val merged =
                    if (upd.entry.length * 2 >= old.entry.length) upd.entry
                    else old.entry + "\n\n" + upd.entry
                journal[idx] = old.copy(
                    entry = merged,
                    category = category,
                    updatedTurn = turnIndex,
                    revisions = old.revisions + 1,
                )
                events.add("Journal updated: ${upd.title}")
            } else {
                journal.add(
                    JournalEntry(
                        category = category,
                        title = upd.title.trim(),
                        entry = upd.entry,
                        updatedTurn = turnIndex,
                        createdTurn = turnIndex,
                    )
                )
                events.add("New journal entry: ${upd.title}")
            }
        }

        // --- Character: XP, levels, perks, HP, gold ---
        var character = save.character
        val xpGained = ai.xp_gained.coerceIn(0, 500)
        if (xpGained > 0) {
            var xp = character.xp + xpGained
            var level = character.level
            var maxHp = character.maxHp
            var hp = character.hp
            while (xp >= level * 100) {
                xp -= level * 100
                level++
                maxHp += 6
                hp = maxHp
                events.add("Level up! You are now level $level")
            }
            character = character.copy(xp = xp, level = level, maxHp = maxHp, hp = hp)
            events.add("+$xpGained XP")
        }
        if (ai.new_perks.isNotEmpty()) {
            val known = character.perks.map { it.name.lowercase() }.toSet()
            val fresh = ai.new_perks
                .filter { it.name.isNotBlank() && it.name.lowercase() !in known }
                .map { Perk(it.name.trim(), it.description) }
            if (fresh.isNotEmpty()) {
                character = character.copy(perks = character.perks + fresh)
                fresh.forEach { events.add("New perk: ${it.name}") }
            }
        }
        val hpChange = ai.stat_changes.hp_change.coerceIn(-200, 200)
        val goldChange = ai.stat_changes.gold_change.coerceIn(-100000, 100000)
        if (hpChange != 0) {
            character = character.copy(hp = (character.hp + hpChange).coerceIn(0, character.maxHp))
            events.add(if (hpChange < 0) "$hpChange HP" else "+$hpChange HP")
        }
        if (goldChange != 0) {
            character = character.copy(gold = (character.gold + goldChange).coerceAtLeast(0))
            events.add(if (goldChange < 0) "$goldChange gold" else "+$goldChange gold")
        }

        // --- Narration, rolls, choices ---
        var narration = ai.narration.trim()
        if (!narration.endsWith("...") && !narration.endsWith("…")) {
            narration = narration.trimEnd('.', ' ') + "..."
        }
        val rolls = ai.dice_rolls.map { r ->
            val sides = r.die.trim().lowercase().removePrefix("d").toIntOrNull() ?: 20
            val roll = if (r.roll in 1..sides) r.roll else (1..sides).random()
            val total = if (r.total != 0) r.total else roll + r.modifier
            DiceRoll(
                label = r.label.ifBlank { "Check" },
                die = "d$sides",
                roll = roll,
                modifier = r.modifier,
                total = total,
                outcome = r.outcome.lowercase(),
            )
        }
        val choices = (ai.choices.filter { it.isNotBlank() }.take(3)).ifEmpty {
            listOf("Press onward", "Investigate your surroundings", "Proceed with caution")
        }

        val turn = StoryTurn(
            playerAction = playerAction,
            narration = narration,
            rolls = rolls,
            choices = choices,
            xpGained = xpGained,
            events = events,
        )

        return save.copy(
            character = character,
            inventory = inventory,
            journal = journal,
            turns = save.turns + turn,
            lastPlayedEpochMs = System.currentTimeMillis(),
            nextItemId = nextItemId,
        )
    }

    private fun normalizeType(type: String): String = when (type.trim().lowercase()) {
        "weapon" -> "weapon"
        "armor", "armour", "shield" -> "armor"
        else -> "item"
    }

    private fun normalizeCategory(category: String): String = when (category.trim().lowercase()) {
        "character", "npc", "person" -> "character"
        "faction", "guild", "organization", "organisation" -> "faction"
        "region", "area", "land" -> "region"
        "nation", "country", "kingdom", "empire" -> "nation"
        "city", "town", "village", "settlement" -> "city"
        else -> "lore"
    }

    private fun persist(save: CampaignSave) {
        saves.save(save)
        _state.value = _state.value.copy(save = save)
    }
}
