package com.arcanequest.app.data

import android.content.Context
import com.arcanequest.app.model.CampaignSave
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File

data class SlotSummary(
    val slot: Int,
    val campaignName: String,
    val characterName: String,
    val level: Int,
    val turnCount: Int,
    val lastPlayedEpochMs: Long,
)

class SaveRepository(context: Context) {

    companion object {
        const val SLOT_COUNT = 6
    }

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        prettyPrint = false
    }

    private val dir: File = File(context.filesDir, "saves").apply { mkdirs() }

    private fun fileFor(slot: Int) = File(dir, "slot_$slot.json")

    fun listSlots(): List<SlotSummary?> = (1..SLOT_COUNT).map { slot ->
        load(slot)?.let {
            SlotSummary(
                slot = slot,
                campaignName = it.setup.campaignName,
                characterName = it.character.name,
                level = it.character.level,
                turnCount = it.turns.size,
                lastPlayedEpochMs = it.lastPlayedEpochMs,
            )
        }
    }

    fun load(slot: Int): CampaignSave? {
        val f = fileFor(slot)
        if (!f.exists()) return null
        return try {
            json.decodeFromString<CampaignSave>(f.readText())
        } catch (_: Exception) {
            null
        }
    }

    fun save(save: CampaignSave) {
        fileFor(save.slot).writeText(json.encodeToString(save))
    }

    fun delete(slot: Int) {
        fileFor(slot).delete()
    }
}
