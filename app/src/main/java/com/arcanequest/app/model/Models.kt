package com.arcanequest.app.model

import kotlinx.serialization.Serializable

@Serializable
data class AbilityScores(
    val strength: Int = 10,
    val dexterity: Int = 10,
    val constitution: Int = 10,
    val intelligence: Int = 10,
    val wisdom: Int = 10,
    val charisma: Int = 10,
) {
    companion object {
        fun modifier(score: Int): Int = Math.floorDiv(score - 10, 2)
        fun modifierText(score: Int): String {
            val m = modifier(score)
            return if (m >= 0) "+$m" else "$m"
        }
    }
}

@Serializable
data class Perk(
    val name: String,
    val description: String = "",
)

@Serializable
data class Item(
    val id: Long,
    val name: String,
    /** weapon | armor | item */
    val type: String = "item",
    val rarity: String = "common",
    val description: String = "",
    val damage: String? = null,
    val armorBonus: Int = 0,
    val valueGold: Int = 0,
    val equipped: Boolean = false,
    val quantity: Int = 1,
)

@Serializable
data class JournalEntry(
    /** character | faction | region | nation | city | lore */
    val category: String,
    val title: String,
    val entry: String,
    val updatedTurn: Int = 0,
    val createdTurn: Int = 0,
    val revisions: Int = 1,
)

@Serializable
data class DiceRoll(
    val label: String = "Check",
    val die: String = "d20",
    val roll: Int = 0,
    val modifier: Int = 0,
    val total: Int = 0,
    val outcome: String = "",
)

@Serializable
data class StoryTurn(
    val playerAction: String? = null,
    val narration: String,
    val rolls: List<DiceRoll> = emptyList(),
    val choices: List<String> = emptyList(),
    val xpGained: Int = 0,
    val events: List<String> = emptyList(),
)

@Serializable
data class CampaignSetup(
    val campaignName: String = "New Campaign",
    val worldDescription: String = "",
    val techLevel: String = "Medieval Fantasy",
    val magicLevel: String = "High Magic",
    val vibe: String = "Heroic Adventure",
    val difficulty: String = "Balanced",
    val extraNotes: String = "",
)

@Serializable
data class CharacterSheet(
    val name: String = "Adventurer",
    val race: String = "Human",
    val characterClass: String = "Fighter",
    val background: String = "",
    val abilities: AbilityScores = AbilityScores(),
    val level: Int = 1,
    val xp: Int = 0,
    val maxHp: Int = 12,
    val hp: Int = 12,
    val gold: Int = 15,
    val perks: List<Perk> = emptyList(),
) {
    /** XP needed to advance from the current level to the next. */
    val xpToNextLevel: Int get() = level * 100
}

@Serializable
data class CampaignSave(
    val slot: Int,
    val setup: CampaignSetup = CampaignSetup(),
    val character: CharacterSheet = CharacterSheet(),
    val inventory: List<Item> = emptyList(),
    val journal: List<JournalEntry> = emptyList(),
    val turns: List<StoryTurn> = emptyList(),
    val lastPlayedEpochMs: Long = 0L,
    val nextItemId: Long = 1L,
)
