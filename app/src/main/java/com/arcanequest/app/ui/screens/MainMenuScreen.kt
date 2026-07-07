package com.arcanequest.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoStories
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.arcanequest.app.data.SaveRepository
import com.arcanequest.app.data.SlotSummary
import com.arcanequest.app.ui.theme.Gold
import com.arcanequest.app.ui.theme.MysticPurple
import java.text.DateFormat
import java.util.Date

@Composable
fun MainMenuScreen(
    onOpenSlot: (slot: Int, isEmpty: Boolean) -> Unit,
    onOpenSettings: () -> Unit,
) {
    val context = LocalContext.current
    val repo = remember { SaveRepository(context) }
    var slots by remember { mutableStateOf<List<SlotSummary?>>(emptyList()) }
    var deleteTarget by remember { mutableStateOf<SlotSummary?>(null) }

    LaunchedEffect(Unit) { slots = repo.listSlots() }

    Column(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(MysticPurple.copy(alpha = 0.25f), MaterialTheme.colorScheme.background)
                    )
                )
                .padding(top = 48.dp, bottom = 24.dp),
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Filled.Casino,
                    contentDescription = null,
                    tint = Gold,
                    modifier = Modifier.size(56.dp),
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    "ARCANEQUEST",
                    style = MaterialTheme.typography.headlineLarge,
                    color = Gold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    "An AI Dungeon Master in your pocket",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(
                onClick = onOpenSettings,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(end = 8.dp),
            ) {
                Icon(Icons.Filled.Settings, contentDescription = "Settings", tint = Gold)
            }
        }

        Text(
            "CAMPAIGN SAVES",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                start = 16.dp, end = 16.dp, bottom = 24.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items((1..SaveRepository.SLOT_COUNT).toList()) { slotNumber ->
                val summary = slots.getOrNull(slotNumber - 1)
                SlotCard(
                    slotNumber = slotNumber,
                    summary = summary,
                    onClick = { onOpenSlot(slotNumber, summary == null) },
                    onDelete = { summary?.let { deleteTarget = it } },
                )
            }
        }
    }

    deleteTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Delete campaign?") },
            text = { Text("\"${target.campaignName}\" in slot ${target.slot} will be lost forever. This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    repo.delete(target.slot)
                    slots = repo.listSlots()
                    deleteTarget = null
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { deleteTarget = null }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun SlotCard(
    slotNumber: Int,
    summary: SlotSummary?,
    onClick: () -> Unit,
    onDelete: () -> Unit,
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (summary != null) MaterialTheme.colorScheme.surface
            else MaterialTheme.colorScheme.surface.copy(alpha = 0.45f),
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                if (summary != null) Icons.Filled.AutoStories else Icons.Filled.Add,
                contentDescription = null,
                tint = if (summary != null) Gold else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(32.dp),
            )
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                if (summary != null) {
                    Text(summary.campaignName, style = MaterialTheme.typography.titleMedium)
                    Text(
                        "${summary.characterName} · Level ${summary.level} · ${summary.turnCount} scenes",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        "Last played " + DateFormat.getDateTimeInstance(
                            DateFormat.MEDIUM, DateFormat.SHORT,
                        ).format(Date(summary.lastPlayedEpochMs)),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    )
                } else {
                    Text(
                        "Slot $slotNumber — Empty",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        "Tap to forge a new campaign",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    )
                }
            }
            if (summary != null) {
                IconButton(onClick = onDelete) {
                    Icon(
                        Icons.Filled.Delete,
                        contentDescription = "Delete save",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
