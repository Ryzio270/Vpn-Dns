package com.arcanequest.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AutoStories
import androidx.compose.material.icons.filled.Backpack
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.arcanequest.app.game.GameViewModel
import com.arcanequest.app.model.AbilityScores
import com.arcanequest.app.model.CampaignSave
import com.arcanequest.app.model.DiceRoll
import com.arcanequest.app.model.Item
import com.arcanequest.app.model.StoryTurn
import com.arcanequest.app.ui.theme.BloodRed
import com.arcanequest.app.ui.theme.ForestGreen
import com.arcanequest.app.ui.theme.Gold
import com.arcanequest.app.ui.theme.MysticPurple
import com.arcanequest.app.ui.theme.rarityColor
import kotlinx.coroutines.delay

private enum class GameTab(val label: String) {
    STORY("Story"), CHARACTER("Character"), INVENTORY("Inventory"), JOURNAL("Journal")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameScreen(
    slot: Int,
    viewModel: GameViewModel,
    onExit: () -> Unit,
) {
    LaunchedEffect(slot) { viewModel.loadSlot(slot) }
    val state by viewModel.state.collectAsState()
    val save = state.save
    var tab by remember { mutableStateOf(GameTab.STORY) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        save?.setup?.campaignName ?: "Loading...",
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onExit) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to menu")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                GameTab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t,
                        onClick = { tab = t },
                        icon = {
                            Icon(
                                when (t) {
                                    GameTab.STORY -> Icons.Filled.AutoStories
                                    GameTab.CHARACTER -> Icons.Filled.Person
                                    GameTab.INVENTORY -> Icons.Filled.Backpack
                                    GameTab.JOURNAL -> Icons.AutoMirrored.Filled.MenuBook
                                },
                                contentDescription = t.label,
                            )
                        },
                        label = { Text(t.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Gold,
                            selectedTextColor = Gold,
                            indicatorColor = MaterialTheme.colorScheme.surfaceVariant,
                        ),
                    )
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (save == null) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    CircularProgressIndicator(color = Gold)
                }
            } else {
                when (tab) {
                    GameTab.STORY -> StoryTab(
                        save = save,
                        thinking = state.thinking,
                        error = state.error,
                        onAct = viewModel::act,
                        onRetry = viewModel::retry,
                        onDismissError = viewModel::dismissError,
                    )
                    GameTab.CHARACTER -> CharacterTab(save)
                    GameTab.INVENTORY -> InventoryTab(save, onToggleEquip = viewModel::toggleEquip)
                    GameTab.JOURNAL -> JournalTab(save)
                }
            }
        }
    }
}

/* ------------------------------- STORY TAB ------------------------------- */

/** Deterministic Pollinations image URL for a scene (free, keyless). */
private fun sceneImageUrl(prompt: String, seed: Int): String {
    val styled = "$prompt, digital fantasy illustration, atmospheric lighting, highly detailed, no text"
    return "https://image.pollinations.ai/prompt/" + android.net.Uri.encode(styled) +
        "?width=768&height=1344&nologo=true&seed=$seed"
}

@Composable
private fun StoryTab(
    save: CampaignSave,
    thinking: Boolean,
    error: String?,
    onAct: (String) -> Unit,
    onRetry: () -> Unit,
    onDismissError: () -> Unit,
) {
    val listState: LazyListState = rememberLazyListState()
    var customAction by remember { mutableStateOf("") }
    val context = androidx.compose.ui.platform.LocalContext.current
    val sceneArtEnabled = remember {
        com.arcanequest.app.data.SettingsRepository(context).sceneArtEnabled()
    }

    // Typewriter state for the newest turn.
    val lastIndex = save.turns.lastIndex
    var revealedChars by remember(save.slot, lastIndex) { mutableIntStateOf(0) }
    val lastNarration = save.turns.lastOrNull()?.narration ?: ""
    val typing = revealedChars < lastNarration.length

    LaunchedEffect(save.slot, lastIndex) {
        if (lastIndex < 0) return@LaunchedEffect
        // Older sessions resume fully revealed; only animate a freshly arrived turn.
        while (revealedChars < lastNarration.length) {
            delay(14)
            revealedChars = (revealedChars + 2).coerceAtMost(lastNarration.length)
        }
    }

    // Keep the view pinned to the bottom while text streams in.
    LaunchedEffect(revealedChars, thinking, error) {
        val total = listState.layoutInfo.totalItemsCount
        if (total > 0) listState.scrollToItem(total - 1)
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // AI-generated scene art behind the story, with a scrim for readability.
        val latestTurn = save.turns.lastOrNull()
        if (sceneArtEnabled && latestTurn != null) {
            val prompt = latestTurn.imagePrompt
                ?: latestTurn.narration.replace('\n', ' ').take(160)
            coil.compose.AsyncImage(
                model = coil.request.ImageRequest.Builder(context)
                    .data(sceneImageUrl(prompt, seed = save.turns.size))
                    .crossfade(900)
                    .build(),
                contentDescription = null,
                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        androidx.compose.ui.graphics.Brush.verticalGradient(
                            listOf(
                                MaterialTheme.colorScheme.background.copy(alpha = 0.55f),
                                MaterialTheme.colorScheme.background.copy(alpha = 0.80f),
                                MaterialTheme.colorScheme.background.copy(alpha = 0.94f),
                            )
                        )
                    ),
            )
        }

        Column(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .clickable(
                    // Tap anywhere in the story to skip the animation.
                    onClick = { if (typing) revealedChars = lastNarration.length },
                ),
            contentPadding = PaddingValues(horizontal = 18.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            itemsIndexed(save.turns) { index, turn ->
                TurnBlock(
                    turn = turn,
                    narrationOverride = if (index == lastIndex) lastNarration.take(revealedChars) else null,
                )
            }

            if (thinking) {
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(
                            color = Gold,
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                        )
                        Spacer(Modifier.width(10.dp))
                        Text(
                            "The Dungeon Master weaves fate...",
                            style = MaterialTheme.typography.bodyMedium,
                            fontStyle = FontStyle.Italic,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            if (error != null) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = BloodRed.copy(alpha = 0.15f),
                        ),
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                "The story stumbled",
                                style = MaterialTheme.typography.titleMedium,
                                color = BloodRed,
                            )
                            Text(
                                error,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Row {
                                TextButton(onClick = onRetry) { Text("Try again", color = Gold) }
                                TextButton(onClick = onDismissError) { Text("Dismiss") }
                            }
                        }
                    }
                }
            }

            // Choices appear once the typewriter finishes.
            val latest = save.turns.lastOrNull()
            if (latest != null && !typing && !thinking && error == null) {
                item {
                    ChoiceBlock(choices = latest.choices, onAct = onAct)
                }
            }
        }

        // Custom action input.
        if (!thinking && save.turns.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedTextField(
                    value = customAction,
                    onValueChange = { customAction = it },
                    placeholder = { Text("Or do something else entirely...") },
                    modifier = Modifier.weight(1f),
                    maxLines = 3,
                )
                Spacer(Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        if (customAction.isNotBlank()) {
                            onAct(customAction)
                            customAction = ""
                        }
                    },
                    modifier = Modifier
                        .size(48.dp)
                        .background(Gold, CircleShape),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Act",
                        tint = MaterialTheme.colorScheme.background,
                    )
                }
            }
        }
        }
    }
}

@Composable
private fun TurnBlock(turn: StoryTurn, narrationOverride: String?) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        turn.playerAction?.let { action ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                Card(
                    shape = RoundedCornerShape(16.dp, 4.dp, 16.dp, 16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MysticPurple.copy(alpha = 0.22f),
                    ),
                ) {
                    Text(
                        action,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }

        if (turn.rolls.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                turn.rolls.forEach { DiceRollChip(it) }
            }
        }

        Text(
            narrationOverride ?: turn.narration,
            style = MaterialTheme.typography.bodyLarge,
        )

        val shownEvents = turn.events.filter { narrationOverride == null || narrationOverride.length == turn.narration.length }
        if (shownEvents.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                shownEvents.forEach { event ->
                    Text(
                        "✦ $event",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gold.copy(alpha = 0.85f),
                    )
                }
            }
        }
    }
}

@Composable
private fun DiceRollChip(roll: DiceRoll) {
    val outcomeColor = when {
        roll.outcome.contains("critical success") -> Gold
        roll.outcome.contains("success") -> ForestGreen
        roll.outcome.contains("critical failure") -> BloodRed
        roll.outcome.contains("fail") -> BloodRed.copy(alpha = 0.85f)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Card(
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
        ),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Filled.Casino,
                contentDescription = null,
                tint = outcomeColor,
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.width(10.dp))
            Column {
                Text(
                    roll.label,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                val modText = when {
                    roll.modifier > 0 -> " + ${roll.modifier}"
                    roll.modifier < 0 -> " − ${-roll.modifier}"
                    else -> ""
                }
                Text(
                    "${roll.die}: ${roll.roll}$modText = ${roll.total}" +
                        if (roll.outcome.isNotBlank()) "  ·  ${roll.outcome.uppercase()}" else "",
                    style = MaterialTheme.typography.bodyMedium,
                    color = outcomeColor,
                )
            }
        }
    }
}

@Composable
private fun ChoiceBlock(choices: List<String>, onAct: (String) -> Unit) {
    val visibleState = remember {
        androidx.compose.animation.core.MutableTransitionState(false).apply { targetState = true }
    }
    AnimatedVisibility(
        visibleState = visibleState,
        enter = fadeIn(tween(500)) + slideInVertically(tween(500)) { it / 3 },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "What do you do?",
                style = MaterialTheme.typography.titleMedium,
                color = Gold,
            )
            choices.forEach { choice ->
                Card(
                    onClick = { onAct(choice) },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        Gold.copy(alpha = 0.35f),
                    ),
                ) {
                    Text(
                        choice,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }
    }
}

/* ----------------------------- CHARACTER TAB ------------------------------ */

@Composable
private fun CharacterTab(save: CampaignSave) {
    val c = save.character
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(c.name, style = MaterialTheme.typography.headlineMedium, color = Gold)
                    Text(
                        "${c.race} ${c.characterClass} · Level ${c.level}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (c.background.isNotBlank()) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            c.background,
                            style = MaterialTheme.typography.bodyMedium,
                            fontStyle = FontStyle.Italic,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    Spacer(Modifier.height(14.dp))
                    Text(
                        "HP  ${c.hp} / ${c.maxHp}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    LinearProgressIndicator(
                        progress = { if (c.maxHp > 0) c.hp.toFloat() / c.maxHp else 0f },
                        color = if (c.hp * 3 <= c.maxHp) BloodRed else ForestGreen,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.fillMaxWidth().height(10.dp),
                    )

                    Spacer(Modifier.height(10.dp))
                    Text(
                        "XP  ${c.xp} / ${c.xpToNextLevel}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    LinearProgressIndicator(
                        progress = { c.xp.toFloat() / c.xpToNextLevel },
                        color = MysticPurple,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.fillMaxWidth().height(10.dp),
                    )

                    Spacer(Modifier.height(10.dp))
                    Text(
                        "Gold: ${c.gold}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gold,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("ABILITY SCORES", style = MaterialTheme.typography.labelLarge, color = Gold)
                    Spacer(Modifier.height(10.dp))
                    val a = c.abilities
                    val entries = listOf(
                        "STR" to a.strength, "DEX" to a.dexterity, "CON" to a.constitution,
                        "INT" to a.intelligence, "WIS" to a.wisdom, "CHA" to a.charisma,
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
                                Text("$score", style = MaterialTheme.typography.titleLarge)
                                Text(
                                    AbilityScores.modifierText(score),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Gold,
                                )
                            }
                        }
                    }
                }
            }
        }

        item {
            Text("PERKS & ABILITIES", style = MaterialTheme.typography.labelLarge, color = Gold)
        }
        if (c.perks.isEmpty()) {
            item {
                Text(
                    "No perks yet. Earn them through deeds, cunning and survival.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontStyle = FontStyle.Italic,
                )
            }
        } else {
            items(c.perks) { perk ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text(perk.name, style = MaterialTheme.typography.titleMedium, color = MysticPurple)
                        if (perk.description.isNotBlank()) {
                            Text(
                                perk.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

/* ----------------------------- INVENTORY TAB ------------------------------ */

@Composable
private fun InventoryTab(save: CampaignSave, onToggleEquip: (Long) -> Unit) {
    val weapons = save.inventory.filter { it.type == "weapon" }
    val armor = save.inventory.filter { it.type == "armor" }
    val other = save.inventory.filter { it.type != "weapon" && it.type != "armor" }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("INVENTORY", style = MaterialTheme.typography.labelLarge, color = Gold)
                Text(
                    "${save.character.gold} gold",
                    style = MaterialTheme.typography.titleMedium,
                    color = Gold,
                )
            }
        }

        if (save.inventory.isEmpty()) {
            item {
                Text(
                    "Your pack is empty. The world will provide... or it won't.",
                    style = MaterialTheme.typography.bodyMedium,
                    fontStyle = FontStyle.Italic,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        listOf(
            "WEAPONS" to weapons,
            "ARMOR" to armor,
            "GEAR & TREASURE" to other,
        ).forEach { (header, list) ->
            if (list.isNotEmpty()) {
                item {
                    Text(
                        header,
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                items(list, key = { it.id }) { item ->
                    ItemCard(item, onToggleEquip)
                }
            }
        }
    }
}

@Composable
private fun ItemCard(item: Item, onToggleEquip: (Long) -> Unit) {
    val equippable = item.type == "weapon" || item.type == "armor"
    Card(
        onClick = { if (equippable) onToggleEquip(item.id) },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = if (item.equipped) androidx.compose.foundation.BorderStroke(1.dp, Gold) else null,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                when (item.type) {
                    "weapon" -> Icons.Filled.Casino
                    "armor" -> Icons.Filled.Shield
                    else -> Icons.Filled.Backpack
                },
                contentDescription = null,
                tint = rarityColor(item.rarity),
                modifier = Modifier.size(26.dp),
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        item.name + if (item.quantity > 1) "  ×${item.quantity}" else "",
                        style = MaterialTheme.typography.titleMedium,
                        color = rarityColor(item.rarity),
                    )
                    if (item.equipped) {
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "EQUIPPED",
                            style = MaterialTheme.typography.labelLarge,
                            color = Gold,
                        )
                    }
                }
                val statLine = buildList {
                    add(item.rarity.replaceFirstChar { it.uppercase() })
                    item.damage?.let { add("Damage $it") }
                    if (item.armorBonus > 0) add("Armor +${item.armorBonus}")
                    if (item.valueGold > 0) add("${item.valueGold}g")
                }.joinToString("  ·  ")
                Text(
                    statLine,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (item.description.isNotBlank()) {
                    Text(
                        item.description,
                        style = MaterialTheme.typography.bodyMedium,
                        fontStyle = FontStyle.Italic,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                    )
                }
                if (equippable) {
                    Text(
                        if (item.equipped) "Tap to unequip" else "Tap to equip",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gold.copy(alpha = 0.6f),
                    )
                }
            }
        }
    }
}

/* ------------------------------ JOURNAL TAB ------------------------------- */

private val JOURNAL_CATEGORIES = listOf(
    "all" to "All",
    "character" to "Characters",
    "faction" to "Factions",
    "region" to "Regions",
    "nation" to "Nations",
    "city" to "Cities",
    "lore" to "Lore",
)

@OptIn(ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun JournalTab(save: CampaignSave) {
    var filter by remember { mutableStateOf("all") }
    val entries = save.journal
        .filter { filter == "all" || it.category == filter }
        .sortedByDescending { it.updatedTurn }

    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Text(
            "WORLD JOURNAL",
            style = MaterialTheme.typography.labelLarge,
            color = Gold,
            modifier = Modifier.padding(vertical = 10.dp),
        )
        androidx.compose.foundation.layout.FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            JOURNAL_CATEGORIES.forEach { (key, label) ->
                val count =
                    if (key == "all") save.journal.size
                    else save.journal.count { it.category == key }
                FilterChip(
                    selected = filter == key,
                    onClick = { filter = key },
                    label = { Text(if (count > 0) "$label ($count)" else label) },
                )
            }
        }
        Spacer(Modifier.height(8.dp))

        if (entries.isEmpty()) {
            Text(
                "The pages are blank. Meet people, discover places, uncover secrets — the journal writes itself.",
                style = MaterialTheme.typography.bodyMedium,
                fontStyle = FontStyle.Italic,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 12.dp),
            )
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(entries) { entry ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                entry.title,
                                style = MaterialTheme.typography.titleMedium,
                                color = Gold,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                entry.category.uppercase(),
                                style = MaterialTheme.typography.labelLarge,
                                color = MysticPurple,
                            )
                        }
                        Spacer(Modifier.height(6.dp))
                        Text(entry.entry, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(6.dp))
                        val meta = buildString {
                            append("Discovered scene ${entry.createdTurn}")
                            if (entry.revisions > 1) {
                                append("  ·  updated scene ${entry.updatedTurn}")
                                append("  ·  ${entry.revisions} revisions")
                            }
                        }
                        Text(
                            meta,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        )
                    }
                }
            }
        }
    }
}
