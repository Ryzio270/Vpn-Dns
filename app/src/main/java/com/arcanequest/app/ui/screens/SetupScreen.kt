package com.arcanequest.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.arcanequest.app.model.AbilityScores
import com.arcanequest.app.model.CampaignSetup
import com.arcanequest.app.model.CharacterSheet
import com.arcanequest.app.ui.theme.Gold
import kotlin.random.Random

private val TECH_LEVELS = listOf(
    "Stone Age", "Bronze Age", "Medieval Fantasy", "Renaissance",
    "Steampunk", "Wild West", "Modern Day", "Cyberpunk", "Space Fantasy", "Post-Apocalyptic",
)
private val MAGIC_LEVELS = listOf("No Magic", "Low Magic", "High Magic", "Magic-Saturated")
private val VIBES = listOf(
    "Heroic Adventure", "Grimdark", "Mystery", "Political Intrigue",
    "Horror", "Comedy", "Exploration", "War Epic", "Slice of Life", "Heist",
)
private val DIFFICULTIES = listOf("Story Mode", "Balanced", "Challenging", "Brutal")

private fun roll4d6DropLowest(): Int {
    val rolls = List(4) { Random.nextInt(1, 7) }.sortedDescending()
    return rolls[0] + rolls[1] + rolls[2]
}

private fun rollAbilities() = AbilityScores(
    strength = roll4d6DropLowest(),
    dexterity = roll4d6DropLowest(),
    constitution = roll4d6DropLowest(),
    intelligence = roll4d6DropLowest(),
    wisdom = roll4d6DropLowest(),
    charisma = roll4d6DropLowest(),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SetupScreen(
    slot: Int,
    onBegin: (CampaignSetup, CharacterSheet) -> Unit,
    onBack: () -> Unit,
) {
    var campaignName by remember { mutableStateOf("") }
    var worldDescription by remember { mutableStateOf("") }
    var techLevel by remember { mutableStateOf("Medieval Fantasy") }
    var magicLevel by remember { mutableStateOf("High Magic") }
    var vibe by remember { mutableStateOf("Heroic Adventure") }
    var difficulty by remember { mutableStateOf("Balanced") }
    var extraNotes by remember { mutableStateOf("") }

    var charName by remember { mutableStateOf("") }
    var race by remember { mutableStateOf("") }
    var charClass by remember { mutableStateOf("") }
    var background by remember { mutableStateOf("") }
    var abilities by remember { mutableStateOf(rollAbilities()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Campaign · Slot $slot") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            SectionHeader("The World")
            OutlinedTextField(
                value = campaignName,
                onValueChange = { campaignName = it },
                label = { Text("Campaign name") },
                placeholder = { Text("The Ashen Crown") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = worldDescription,
                onValueChange = { worldDescription = it },
                label = { Text("What is the world like?") },
                placeholder = { Text("A shattered empire of floating isles where dragons rule the skies... (leave blank and the AI invents one)") },
                minLines = 3,
                modifier = Modifier.fillMaxWidth(),
            )

            ChipPicker("Technology level", TECH_LEVELS, techLevel) { techLevel = it }
            ChipPicker("Magic", MAGIC_LEVELS, magicLevel) { magicLevel = it }
            ChipPicker("Campaign vibe", VIBES, vibe) { vibe = it }
            ChipPicker("Difficulty", DIFFICULTIES, difficulty) { difficulty = it }

            OutlinedTextField(
                value = extraNotes,
                onValueChange = { extraNotes = it },
                label = { Text("Anything else? (optional)") },
                placeholder = { Text("I want a rival NPC, lots of sea travel, no spiders...") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth(),
            )

            SectionHeader("Your Hero")
            OutlinedTextField(
                value = charName,
                onValueChange = { charName = it },
                label = { Text("Character name") },
                placeholder = { Text("Kaelen Voss") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = race,
                    onValueChange = { race = it },
                    label = { Text("Race / origin") },
                    placeholder = { Text("Half-elf") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = charClass,
                    onValueChange = { charClass = it },
                    label = { Text("Class") },
                    placeholder = { Text("Rogue") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
            }
            OutlinedTextField(
                value = background,
                onValueChange = { background = it },
                label = { Text("Backstory (optional)") },
                placeholder = { Text("A disgraced knight seeking redemption...") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth(),
            )

            SectionHeader("Ability Scores (4d6, drop lowest)")
            AbilityRow(abilities)
            Button(
                onClick = { abilities = rollAbilities() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = Gold,
                ),
            ) {
                Icon(Icons.Filled.Casino, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Reroll stats")
            }

            Spacer(Modifier.height(4.dp))
            Button(
                onClick = {
                    val conMod = AbilityScores.modifier(abilities.constitution)
                    val maxHp = (10 + conMod).coerceAtLeast(6)
                    onBegin(
                        CampaignSetup(
                            campaignName = campaignName.ifBlank { "Untitled Campaign" },
                            worldDescription = worldDescription,
                            techLevel = techLevel,
                            magicLevel = magicLevel,
                            vibe = vibe,
                            difficulty = difficulty,
                            extraNotes = extraNotes,
                        ),
                        CharacterSheet(
                            name = charName.ifBlank { "The Wanderer" },
                            race = race.ifBlank { "Human" },
                            characterClass = charClass.ifBlank { "Adventurer" },
                            background = background,
                            abilities = abilities,
                            maxHp = maxHp,
                            hp = maxHp,
                            gold = 15 + Random.nextInt(0, 11),
                        ),
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
            ) {
                Text("⚔  Begin the Adventure", style = MaterialTheme.typography.titleMedium)
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        title.uppercase(),
        style = MaterialTheme.typography.labelLarge,
        color = Gold,
        modifier = Modifier.padding(top = 10.dp),
    )
}

@OptIn(ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun ChipPicker(
    label: String,
    options: List<String>,
    selected: String,
    onSelect: (String) -> Unit,
) {
    Column {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        androidx.compose.foundation.layout.FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            options.forEach { option ->
                FilterChip(
                    selected = option == selected,
                    onClick = { onSelect(option) },
                    label = { Text(option) },
                )
            }
        }
    }
}

@Composable
private fun AbilityRow(abilities: AbilityScores) {
    val entries = listOf(
        "STR" to abilities.strength,
        "DEX" to abilities.dexterity,
        "CON" to abilities.constitution,
        "INT" to abilities.intelligence,
        "WIS" to abilities.wisdom,
        "CHA" to abilities.charisma,
    )
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        entries.forEach { (label, score) ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    label,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text("$score", style = MaterialTheme.typography.titleLarge, color = Gold)
                Text(
                    AbilityScores.modifierText(score),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
