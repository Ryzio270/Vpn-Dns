package com.arcanequest.app.ui.screens

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.LocationCity
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Terrain
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
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.arcanequest.app.data.SettingsRepository
import com.arcanequest.app.game.GameViewModel
import com.arcanequest.app.model.AbilityScores
import com.arcanequest.app.model.CampaignSave
import com.arcanequest.app.model.DiceRoll
import com.arcanequest.app.model.Item
import com.arcanequest.app.model.StoryTurn
import com.arcanequest.app.ui.theme.BloodRed
import com.arcanequest.app.ui.theme.ForestGreen
import com.arcanequest.app.ui.theme.Gold
import com.arcanequest.app.ui.theme.LocalAccent
import com.arcanequest.app.ui.theme.MysticPurple
import com.arcanequest.app.ui.theme.rarityColor
import com.arcanequest.app.ui.theme.vibeAccent
import kotlinx.coroutines.delay

private enum class GameTab(val label: String) {
    STORY("Story"), QUESTS("Quests"), CHARACTER("Hero"), WORLD("World"), JOURNAL("Journal")
}

/* ------------------------------- HELPERS --------------------------------- */

private fun vibrate(context: Context, ms: Long, amplitude: Int) {
    try {
        val vibrator = if (Build.VERSION.SDK_INT >= 31) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        vibrator.vibrate(VibrationEffect.createOneShot(ms, amplitude.coerceIn(1, 255)))
    } catch (_: Exception) {
        // Devices without a vibrator: silently skip.
    }
}

/** Deterministic Pollinations image URL for a scene (free, keyless). */
private fun sceneImageUrl(prompt: String, seed: Int): String {
    val styled = "$prompt, digital fantasy illustration, atmospheric lighting, highly detailed, no text"
    return "https://image.pollinations.ai/prompt/" + android.net.Uri.encode(styled) +
        "?width=768&height=1344&nologo=true&seed=$seed"
}

/** Deterministic Pollinations URL for the campaign world map. */
private fun worldMapUrl(save: CampaignSave, placeNames: List<String>): String {
    val prompt = "hand-drawn fantasy parchment map, aged paper, ink and sepia cartography, " +
        "compass rose, mountain ranges, forests, coastlines, ornate border, top-down view, " +
        "${save.setup.techLevel} world, marking the locations of: ${placeNames.joinToString(", ")}"
    return "https://image.pollinations.ai/prompt/" + android.net.Uri.encode(prompt) +
        "?width=1024&height=1024&nologo=true&seed=${save.slot * 1000 + placeNames.size}"
}

/* ------------------------------ GAME SCREEN ------------------------------ */

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

    // Haptics: buzz on new dice rolls, level-ups and quest completions.
    val context = LocalContext.current
    var hapticTurnCount by remember { mutableIntStateOf(-1) }
    LaunchedEffect(save?.turns?.size) {
        val turns = save?.turns ?: return@LaunchedEffect
        if (hapticTurnCount == -1) {
            hapticTurnCount = turns.size // skip the initial load
            return@LaunchedEffect
        }
        if (turns.size > hapticTurnCount) {
            hapticTurnCount = turns.size
            val turn = turns.last()
            if (turn.rolls.isNotEmpty()) {
                val crit = turn.rolls.any { it.outcome.contains("critical") }
                vibrate(context, if (crit) 140 else 45, if (crit) 255 else 130)
            }
            if (turn.events.any { it.startsWith("Level up") || it.startsWith("Quest completed") }) {
                delay(250)
                vibrate(context, 70, 190)
                delay(140)
                vibrate(context, 160, 255)
            }
        }
    }

    val accent = save?.setup?.vibe?.let { vibeAccent(it) } ?: Gold

    CompositionLocalProvider(LocalAccent provides accent) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Text(
                            save?.setup?.campaignName ?: "Loading...",
                            style = MaterialTheme.typography.titleLarge,
                            color = LocalAccent.current,
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
                                        GameTab.QUESTS -> Icons.Filled.Flag
                                        GameTab.CHARACTER -> Icons.Filled.Person
                                        GameTab.WORLD -> Icons.Filled.Map
                                        GameTab.JOURNAL -> Icons.AutoMirrored.Filled.MenuBook
                                    },
                                    contentDescription = t.label,
                                )
                            },
                            label = { Text(t.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = LocalAccent.current,
                                selectedTextColor = LocalAccent.current,
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
                        CircularProgressIndicator(color = LocalAccent.current)
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
                        GameTab.QUESTS -> QuestsTab(save)
                        GameTab.CHARACTER -> CharacterTab(save, onToggleEquip = viewModel::toggleEquip)
                        GameTab.WORLD -> WorldTab(save)
                        GameTab.JOURNAL -> JournalTab(save)
                    }
                }
            }
        }
    }
}

/* ------------------------------- STORY TAB ------------------------------- */

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
    val context = LocalContext.current
    val sceneArtEnabled = remember { SettingsRepository(context).sceneArtEnabled() }

    // Typewriter state for the newest turn.
    val lastIndex = save.turns.lastIndex
    var revealedChars by remember(save.slot, lastIndex) { mutableIntStateOf(0) }
    val lastNarration = save.turns.lastOrNull()?.narration ?: ""
    val typing = revealedChars < lastNarration.length

    LaunchedEffect(save.slot, lastIndex) {
        if (lastIndex < 0) return@LaunchedEffect
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
        // AI-generated scene art behind the story, slowly drifting (Ken Burns).
        val latestTurn = save.turns.lastOrNull()
        if (sceneArtEnabled && latestTurn != null) {
            val kenBurns = rememberInfiniteTransition(label = "kenburns")
            val kbScale by kenBurns.animateFloat(
                initialValue = 1.06f,
                targetValue = 1.18f,
                animationSpec = infiniteRepeatable(tween(24000, easing = LinearEasing), RepeatMode.Reverse),
                label = "kbScale",
            )
            val kbShift by kenBurns.animateFloat(
                initialValue = -14f,
                targetValue = 14f,
                animationSpec = infiniteRepeatable(tween(32000, easing = LinearEasing), RepeatMode.Reverse),
                label = "kbShift",
            )
            val prompt = latestTurn.imagePrompt
                ?: latestTurn.narration.replace('\n', ' ').take(160)
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data(sceneImageUrl(prompt, seed = save.turns.size))
                    .crossfade(900)
                    .build(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = kbScale
                        scaleY = kbScale
                        translationX = kbShift
                    },
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
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
                        animateRolls = index == lastIndex,
                    )
                }

                if (thinking) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(
                                color = LocalAccent.current,
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
                                    TextButton(onClick = onRetry) {
                                        Text("Try again", color = LocalAccent.current)
                                    }
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
                            .background(LocalAccent.current, CircleShape),
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
private fun TurnBlock(turn: StoryTurn, narrationOverride: String?, animateRolls: Boolean) {
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
                turn.rolls.forEach { DiceRollChip(it, animate = animateRolls) }
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
                        color = LocalAccent.current.copy(alpha = 0.85f),
                    )
                }
            }
        }
    }
}

@Composable
private fun DiceRollChip(roll: DiceRoll, animate: Boolean) {
    val outcomeColor = when {
        roll.outcome.contains("critical success") -> LocalAccent.current
        roll.outcome.contains("success") -> ForestGreen
        roll.outcome.contains("critical failure") -> BloodRed
        roll.outcome.contains("fail") -> BloodRed.copy(alpha = 0.85f)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    // Spin the die when the roll first lands; older rolls render settled.
    val rotation = remember { Animatable(if (animate) 0f else 720f) }
    var settled by remember { mutableStateOf(!animate) }
    LaunchedEffect(animate) {
        if (animate && !settled) {
            rotation.animateTo(720f, tween(850, easing = FastOutSlowInEasing))
            settled = true
        }
    }
    val resultAlpha by animateFloatAsState(
        targetValue = if (settled) 1f else 0f,
        animationSpec = tween(300),
        label = "diceResult",
    )

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
                modifier = Modifier
                    .size(20.dp)
                    .graphicsLayer { rotationZ = rotation.value },
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
                    if (settled || resultAlpha > 0f)
                        "${roll.die}: ${roll.roll}$modText = ${roll.total}" +
                            if (roll.outcome.isNotBlank()) "  ·  ${roll.outcome.uppercase()}" else ""
                    else "rolling...",
                    style = MaterialTheme.typography.bodyMedium,
                    color = outcomeColor,
                    modifier = Modifier.graphicsLayer { alpha = if (settled) 1f else 0.35f + resultAlpha },
                )
            }
        }
    }
}

@Composable
private fun ChoiceBlock(choices: List<String>, onAct: (String) -> Unit) {
    val visibleState = remember {
        MutableTransitionState(false).apply { targetState = true }
    }
    AnimatedVisibility(
        visibleState = visibleState,
        enter = fadeIn(tween(500)) + slideInVertically(tween(500)) { it / 3 },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "What do you do?",
                style = MaterialTheme.typography.titleMedium,
                color = LocalAccent.current,
            )
            choices.forEach { choice ->
                Card(
                    onClick = { onAct(choice) },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
                    border = BorderStroke(1.dp, LocalAccent.current.copy(alpha = 0.35f)),
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

/* ------------------------------- QUESTS TAB ------------------------------ */

@Composable
private fun QuestsTab(save: CampaignSave) {
    val active = save.quests.filter { it.status == "active" }.sortedByDescending { it.updatedTurn }
    val completed = save.quests.filter { it.status == "completed" }.sortedByDescending { it.updatedTurn }
    val failed = save.quests.filter { it.status == "failed" }.sortedByDescending { it.updatedTurn }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("QUEST LOG", style = MaterialTheme.typography.labelLarge, color = LocalAccent.current)
        }

        if (save.quests.isEmpty()) {
            item {
                Text(
                    "No quests yet. Talk to people, poke your nose where it doesn't belong — purpose will find you.",
                    style = MaterialTheme.typography.bodyMedium,
                    fontStyle = FontStyle.Italic,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        if (active.isNotEmpty()) {
            item {
                Text(
                    "ACTIVE",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            items(active) { quest -> QuestCard(quest, LocalAccent.current) }
        }
        if (completed.isNotEmpty()) {
            item {
                Text(
                    "COMPLETED",
                    style = MaterialTheme.typography.labelLarge,
                    color = ForestGreen,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            items(completed) { quest -> QuestCard(quest, ForestGreen) }
        }
        if (failed.isNotEmpty()) {
            item {
                Text(
                    "FAILED",
                    style = MaterialTheme.typography.labelLarge,
                    color = BloodRed,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            items(failed) { quest -> QuestCard(quest, BloodRed) }
        }
    }
}

@Composable
private fun QuestCard(quest: com.arcanequest.app.model.Quest, tint: androidx.compose.ui.graphics.Color) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = if (quest.status == "active") BorderStroke(1.dp, tint.copy(alpha = 0.4f)) else null,
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                quest.title,
                style = MaterialTheme.typography.titleMedium,
                color = tint,
                textDecoration = if (quest.status != "active") TextDecoration.LineThrough else null,
            )
            if (quest.objective.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(quest.objective, style = MaterialTheme.typography.bodyMedium)
            }
            if (quest.log.isNotEmpty()) {
                Spacer(Modifier.height(6.dp))
                quest.log.takeLast(4).forEach { note ->
                    Text(
                        "• $note",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "Started scene ${quest.createdTurn}" +
                    if (quest.updatedTurn > quest.createdTurn) "  ·  updated scene ${quest.updatedTurn}" else "",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
            )
        }
    }
}

/* ------------------------ CHARACTER TAB (with gear) ---------------------- */

@Composable
private fun CharacterTab(save: CampaignSave, onToggleEquip: (Long) -> Unit) {
    val c = save.character
    val weapons = save.inventory.filter { it.type == "weapon" }
    val armor = save.inventory.filter { it.type == "armor" }
    val other = save.inventory.filter { it.type != "weapon" && it.type != "armor" }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(c.name, style = MaterialTheme.typography.headlineMedium, color = LocalAccent.current)
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
                        color = LocalAccent.current,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("ABILITY SCORES", style = MaterialTheme.typography.labelLarge, color = LocalAccent.current)
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
                                    color = LocalAccent.current,
                                )
                            }
                        }
                    }
                }
            }
        }

        item {
            Text("PERKS & ABILITIES", style = MaterialTheme.typography.labelLarge, color = LocalAccent.current)
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

        item {
            Text(
                "INVENTORY",
                style = MaterialTheme.typography.labelLarge,
                color = LocalAccent.current,
                modifier = Modifier.padding(top = 8.dp),
            )
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
                        modifier = Modifier.padding(top = 4.dp),
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
        border = if (item.equipped) BorderStroke(1.dp, LocalAccent.current) else null,
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
                            color = LocalAccent.current,
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
                        color = LocalAccent.current.copy(alpha = 0.6f),
                    )
                }
            }
        }
    }
}

/* ------------------------------- WORLD TAB ------------------------------- */

@Composable
private fun WorldTab(save: CampaignSave) {
    val context = LocalContext.current
    val places = save.journal
        .filter { it.category == "region" || it.category == "nation" || it.category == "city" }
        .sortedBy { it.createdTurn }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("WORLD MAP", style = MaterialTheme.typography.labelLarge, color = LocalAccent.current)
        }

        item {
            if (places.isEmpty()) {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Text(
                        "Uncharted. Discover cities, regions and nations and the cartographers will get to work...",
                        style = MaterialTheme.typography.bodyMedium,
                        fontStyle = FontStyle.Italic,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            } else {
                Card(
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, LocalAccent.current.copy(alpha = 0.4f)),
                ) {
                    AsyncImage(
                        model = ImageRequest.Builder(context)
                            .data(worldMapUrl(save, places.takeLast(10).map { it.title }))
                            .crossfade(700)
                            .build(),
                        contentDescription = "World map",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(1f),
                    )
                }
                Text(
                    "Redrawn by the royal cartographers as you discover new places.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }

        if (places.isNotEmpty()) {
            item {
                Text(
                    "DISCOVERED PLACES",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            items(places.reversed()) { place ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            when (place.category) {
                                "city" -> Icons.Filled.LocationCity
                                "nation" -> Icons.Filled.Public
                                else -> Icons.Filled.Terrain
                            },
                            contentDescription = null,
                            tint = LocalAccent.current,
                            modifier = Modifier.size(26.dp),
                        )
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(place.title, style = MaterialTheme.typography.titleMedium)
                            Text(
                                place.entry.replace('\n', ' ').take(140) +
                                    if (place.entry.length > 140) "…" else "",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                "${place.category.replaceFirstChar { it.uppercase() }} · discovered scene ${place.createdTurn}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                            )
                        }
                    }
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
            color = LocalAccent.current,
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
                                color = LocalAccent.current,
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
