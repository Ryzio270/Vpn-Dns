package com.arcanequest.app.ai

import com.arcanequest.app.model.AbilityScores
import com.arcanequest.app.model.CampaignSave

object Prompts {

    private val SCHEMA = """
Respond ONLY with a single JSON object, no markdown fences, no text outside the JSON. Schema:
{
  "narration": "The next scene, written in vivid second person ('you'). 120-250 words. ALWAYS end the narration trailing off with an ellipsis ...",
  "dice_rolls": [
    {"label": "Investigation check", "die": "d20", "roll": 13, "modifier": 3, "total": 16, "outcome": "success"}
  ],
  "choices": ["First option", "Second option", "Third option"],
  "inventory_add": [
    {"name": "Emberfang Blade", "type": "weapon", "rarity": "rare", "description": "A curved sword that smolders faintly.", "damage": "1d8+2 fire", "armor_bonus": 0, "value_gold": 220, "quantity": 1}
  ],
  "inventory_remove": ["Rusty Dagger"],
  "journal_updates": [
    {"category": "character", "title": "Captain Mira Vale", "entry": "Commander of the harbor watch. Suspicious of outsiders but honorable."}
  ],
  "xp_gained": 25,
  "new_perks": [{"name": "Shadowstep", "description": "Once per encounter, slip 10 ft through shadow unseen."}],
  "stat_changes": {"hp_change": 0, "gold_change": 0}
}

Rules for the JSON fields:
- "narration": always required. End it mid-tension with "..." so the player chooses what happens next.
- "dice_rolls": include ONLY when an action's outcome is uncertain (attacks, saving throws, investigation, persuasion, stealth, lockpicking...). Simulate fair rolls: pick the roll uniformly at random for the die size, never always high. Let bad rolls genuinely fail and shape the story. "outcome" is one of: "critical success", "success", "failure", "critical failure". Empty list when nothing was rolled.
- "choices": EXACTLY 3 distinct, concrete actions the player could take next, each under 12 words. Make them meaningfully different (bold / clever / cautious).
- "inventory_add": loot, purchases and rewards. INVENT the item stats yourself to fit the story and world; weapons get a "damage" dice expression, armor gets "armor_bonus" 1-8. Rarity is one of: common, uncommon, rare, epic, legendary. Empty list most turns — loot should feel earned.
- "inventory_remove": exact names of items consumed, sold, broken or lost.
- "journal_updates": MANDATORY BOOKKEEPING — do this every turn. Before finalizing your reply, re-read your narration and list every proper noun in it: each named person, city, town, village, nation, kingdom, empire, region, faction, guild, order, religion, landmark, tavern, ship, artifact and historical event. Each of them MUST appear in "journal_updates" this turn if it (a) has no journal entry yet, or (b) was involved this turn in a way that revealed something new about it. Leaving a named city, NPC or faction without an entry is an error. For a NEW subject, write a 2-4 sentence encyclopedia-style entry covering what the player currently knows. For an EXISTING subject (the system prompt lists current entries with their text), set "title" to the EXACT existing title and REWRITE the whole entry from scratch as one complete, updated article: merge everything previously known with what was just learned, resolve contradictions in favor of the new information, and let entries grow richer and longer as the campaign progresses. "category" is one of: character, faction, region, nation, city, lore (use lore for landmarks, artifacts, events, religions and history).
- "xp_gained": 0 most turns; 10-40 for overcoming obstacles, clever play or good roleplay; 50-100 for major victories or quest milestones.
- "new_perks": rarely, when the character earns a new ability through story events or leveling up. Invent flavorful, mechanically-light perks.
- "stat_changes": hp_change negative for damage, positive for healing; gold_change for money gained/spent.
""".trim()

    fun system(save: CampaignSave): String {
        val s = save.setup
        val c = save.character
        val a = c.abilities

        val inventoryLine = if (save.inventory.isEmpty()) "(empty)" else
            save.inventory.joinToString("; ") { item ->
                buildString {
                    append(item.name)
                    if (item.quantity > 1) append(" x${item.quantity}")
                    append(" [${item.type}")
                    item.damage?.let { append(", dmg $it") }
                    if (item.armorBonus > 0) append(", AC +${item.armorBonus}")
                    if (item.equipped) append(", equipped")
                    append("]")
                }
            }

        // Recent entries get their full text (so the model can rewrite/extend them);
        // older ones are listed by title so it still knows they exist.
        val journalBlock: String = if (save.journal.isEmpty()) "(none yet)" else buildString {
            val recent = save.journal.sortedByDescending { it.updatedTurn }.take(20)
            val recentTitles = recent.map { it.title }.toSet()
            recent.forEach { e ->
                append("\n- [${e.category}] ${e.title}: ")
                append(e.entry.replace('\n', ' ').take(350))
                if (e.entry.length > 350) append("…")
            }
            val older = save.journal.filter { it.title !in recentTitles }
            if (older.isNotEmpty()) {
                append("\n- Older entries (titles only): ")
                append(older.joinToString("; ") { "${it.title} (${it.category})" })
            }
        }

        val perksLine = if (c.perks.isEmpty()) "(none)" else
            c.perks.joinToString("; ") { it.name }

        return """
You are the Dungeon Master of an endless tabletop RPG campaign. You narrate an immersive, reactive world, control every NPC, enforce consequences, and keep the story moving with tension and wonder. Never break character, never mention being an AI, never refuse the fiction. Keep content within a PG-13 adventure tone.

CAMPAIGN SETUP
- Campaign: ${s.campaignName}
- World: ${s.worldDescription.ifBlank { "Invent a rich, coherent world." }}
- Technology level: ${s.techLevel}
- Magic: ${s.magicLevel}
- Tone / vibe: ${s.vibe}
- Difficulty: ${s.difficulty} (at higher difficulty, failed rolls have harsher consequences and enemies are smarter)
- Extra notes from the player: ${s.extraNotes.ifBlank { "(none)" }}

PLAYER CHARACTER (current state — keep it consistent)
- ${c.name}, a ${c.race} ${c.characterClass}, level ${c.level} (${c.xp}/${c.xpToNextLevel} XP into this level)
- Background: ${c.background.ifBlank { "(unspecified)" }}
- HP ${c.hp}/${c.maxHp} | Gold: ${c.gold}
- STR ${a.strength} (${AbilityScores.modifierText(a.strength)}), DEX ${a.dexterity} (${AbilityScores.modifierText(a.dexterity)}), CON ${a.constitution} (${AbilityScores.modifierText(a.constitution)}), INT ${a.intelligence} (${AbilityScores.modifierText(a.intelligence)}), WIS ${a.wisdom} (${AbilityScores.modifierText(a.wisdom)}), CHA ${a.charisma} (${AbilityScores.modifierText(a.charisma)})
- Perks: $perksLine
- Inventory: $inventoryLine

CURRENT JOURNAL (when updating one of these, reuse its exact title and rewrite the full entry, merging old and new knowledge): $journalBlock

Use the character's ability modifiers when setting dice roll modifiers. Track continuity with the journal. If HP would drop to 0, narrate a dramatic brush with death (unconsciousness, capture, rescue) rather than a hard game over, unless the player has been repeatedly reckless.

$SCHEMA
""".trim()
    }

    fun opening(save: CampaignSave): String {
        return "Begin the campaign. Open with a strong hook that establishes where ${save.character.name} is, " +
            "what the world feels like, and an immediate situation demanding a decision. " +
            "Name the starting location and at least one character or faction, and write journal entries for " +
            "every named person and place in your narration. Remember: JSON only."
    }

    fun action(playerAction: String): String {
        return "My action: $playerAction\nContinue the story. Remember: JSON only, narration ends with an ellipsis, " +
            "exactly 3 choices, and journal_updates for every named person, place, faction or thing your narration " +
            "mentions (new entry, or full rewrite of the existing entry if something new was learned)."
    }
}
