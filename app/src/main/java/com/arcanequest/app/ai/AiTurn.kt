package com.arcanequest.app.ai

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Structured payload the Dungeon Master model is instructed to return. */

@Serializable
data class AiRoll(
    val label: String = "Check",
    val die: String = "d20",
    val roll: Int = 0,
    val modifier: Int = 0,
    val total: Int = 0,
    val outcome: String = "",
)

@Serializable
data class AiItem(
    val name: String,
    val type: String = "item",
    val rarity: String = "common",
    val description: String = "",
    val damage: String? = null,
    val armor_bonus: Int = 0,
    val value_gold: Int = 0,
    val quantity: Int = 1,
)

@Serializable
data class AiJournalUpdate(
    val category: String = "lore",
    val title: String,
    val entry: String,
)

@Serializable
data class AiPerk(
    val name: String,
    val description: String = "",
)

@Serializable
data class AiStatChanges(
    val hp_change: Int = 0,
    val gold_change: Int = 0,
)

@Serializable
data class AiTurn(
    val narration: String = "",
    val dice_rolls: List<AiRoll> = emptyList(),
    val choices: List<String> = emptyList(),
    val inventory_add: List<AiItem> = emptyList(),
    val inventory_remove: List<String> = emptyList(),
    val journal_updates: List<AiJournalUpdate> = emptyList(),
    val xp_gained: Int = 0,
    val new_perks: List<AiPerk> = emptyList(),
    val stat_changes: AiStatChanges = AiStatChanges(),
)

object AiTurnParser {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    /**
     * Extracts the JSON object from the model output (tolerating markdown fences
     * and stray prose) and decodes it. Falls back to treating the whole text as
     * narration so a malformed reply never crashes the game.
     */
    fun parse(raw: String): AiTurn {
        val candidate = extractJsonObject(raw)
        if (candidate != null) {
            try {
                val turn = json.decodeFromString<AiTurn>(candidate)
                if (turn.narration.isNotBlank()) return turn
            } catch (_: Exception) {
                // fall through to plain-text fallback
            }
        }
        val cleaned = raw
            .replace("```json", "")
            .replace("```", "")
            .trim()
        return AiTurn(
            narration = cleaned.ifBlank { "The mists swirl, but the story falters. Try again..." },
            choices = listOf(
                "Press onward",
                "Look around carefully",
                "Take a moment to rest and think",
            ),
        )
    }

    private fun extractJsonObject(raw: String): String? {
        val start = raw.indexOf('{')
        val end = raw.lastIndexOf('}')
        if (start < 0 || end <= start) return null
        return raw.substring(start, end + 1)
    }
}
