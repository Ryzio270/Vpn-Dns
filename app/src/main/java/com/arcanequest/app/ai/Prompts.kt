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
- "journal_updates": whenever a NEW important character, faction, region, nation, city, or piece of lore is introduced, or an existing one changes meaningfully, write an encyclopedia-style entry (2-4 sentences). "category" is one of: character, faction, region, nation, city, lore. Reuse the exact same title to update an existing entry.
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

        val journalLine = if (save.journal.isEmpty()) "(none yet)" else
            save.journal.joinToString("; ") { "${it.title} (${it.category})" }

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

KNOWN JOURNAL ENTRIES (titles you may update): $journalLine

Use the character's ability modifiers when setting dice roll modifiers. Track continuity with the journal. If HP would drop to 0, narrate a dramatic brush with death (unconsciousness, capture, rescue) rather than a hard game over, unless the player has been repeatedly reckless.

$SCHEMA
""".trim()
    }

    fun opening(save: CampaignSave): String {
        return "Begin the campaign. Open with a strong hook that establishes where ${save.character.name} is, " +
            "what the world feels like, and an immediate situation demanding a decision. " +
            "Introduce at least one journal-worthy character, faction or place. Remember: JSON only."
    }

    fun action(playerAction: String): String {
        return "My action: $playerAction\nContinue the story. Remember: JSON only, narration ends with an ellipsis, exactly 3 choices."
    }
}
