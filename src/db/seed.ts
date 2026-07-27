import { db, type LoreCategory } from './schema'
import { createCampaign } from './repository'

/**
 * "Load example campaign" content (spec §11). Deliberately opt-in — a fresh
 * install starts empty, this only runs when the user taps the button.
 */
export async function seedExampleCampaign(): Promise<number> {
  const campaignId = await createCampaign({
    name: 'The Ashen Reaches',
    settingSummary:
      'Three centuries after the Cinderfall, the Ashen Reaches are a grey expanse of ash-drowned ' +
      'townships and half-buried ruins beneath a sun that never fully rises. Ashfall is measured in ' +
      'seasons, not storms. The Hollow Choir — an order of ash-masked clerics — rations clean water ' +
      'and calls it mercy. Everyone owes someone, and debt is inherited.',
    tone: 'Grim, low-magic dark fantasy. Scarcity matters, violence has consequences, and hope is rationed but real.',
    character: {
      name: 'Vesper Quill',
      race: 'Half-elf',
      characterClass: 'Rogue (Thief)',
      backstory:
        'Raised in the undercrofts of Cinderhold picking pockets for the Ledger, a debt-broker guild ' +
        'that owns half the Reaches. Vesper bought her own name back at nineteen and has been ' +
        'undercutting the Ledger ever since — quietly, and never twice from the same street.',
    },
  })

  const character = await db.characters.where('campaignId').equals(campaignId).first()
  const characterId = character?.id ?? 0

  await db.characters.update(characterId, {
    level: 3,
    hpCurrent: 19,
    hpMax: 24,
    xp: 900,
    statsJson: {
      strength: 9,
      dexterity: 17,
      constitution: 12,
      intelligence: 13,
      wisdom: 11,
      charisma: 14,
    },
  })

  await db.inventoryItems.bulkAdd(
    [
      {
        name: 'Ashglass Dagger',
        description:
          'Knapped from volcanic glass fused in the Cinderfall. Wickedly sharp, and it will not hold ' +
          'an edge past one more serious fight.',
        quantity: 1,
        equipped: true,
        itemType: 'weapon',
        rarity: 'uncommon',
      },
      {
        name: 'Soot-Grey Cloak',
        description: 'Ash-dyed wool. Advantage on hiding in open ashfall, useless indoors.',
        quantity: 1,
        equipped: true,
        itemType: 'armor',
        rarity: 'common',
      },
      {
        name: 'Ledger Seal (stolen)',
        description:
          'A debt-broker’s wax seal lifted off a drunk factor in Cinderhold. Opens doors. ' +
          'Also gets throats cut, if the wrong person recognises it.',
        quantity: 1,
        equipped: false,
        itemType: 'quest',
        rarity: 'rare',
      },
      {
        name: 'Clean Water Ration',
        description: 'Hollow Choir issue, sealed with grey wax. The only currency that never devalues.',
        quantity: 4,
        equipped: false,
        itemType: 'consumable',
        rarity: 'common',
      },
      {
        name: 'Lockpicks, worn',
        description: 'Six picks, two tension wrenches, one bent beyond saving.',
        quantity: 1,
        equipped: false,
        itemType: 'tool',
        rarity: 'common',
      },
    ].map((item) => ({ ...item, campaignId, characterId })),
  )

  await db.quests.bulkAdd([
    {
      campaignId,
      title: 'The Missing Caravan',
      description:
        'The Marrow Road caravan out of Cinderhold is eleven days overdue with a full season of clean ' +
        'water. Reeve Tallow is paying in rations, not coin, to find out where it went.',
      status: 'active',
      questGiver: 'Reeve Tallow',
      logJson: [
        { turn: 0, note: 'Tallow offers twenty rations. Says the caravan never reached Ninefold Gate.' },
        { turn: 0, note: 'Found cart ruts leaving the Marrow Road eastward — nobody drives east.' },
      ],
    },
    {
      campaignId,
      title: 'A Name Off The Ledger',
      description:
        'Vesper’s brother Corvin is still listed as collateral in the Ledger’s Cinderhold ' +
        'registry. The registry is real, physical, and burnable.',
      status: 'active',
      questGiver: 'Personal',
      logJson: [{ turn: 0, note: 'Confirmed the registry is kept below the Counting House, not in it.' }],
    },
    {
      campaignId,
      title: 'The Drowned Bell',
      description: 'Recover the bell of Saint Aumery from the flooded chapel beneath Greyhearth.',
      status: 'completed',
      questGiver: 'Sister Vane',
      logJson: [
        { turn: 0, note: 'Chapel flooded to the second gallery. Bell recovered; the rope was cut, not rotted.' },
        { turn: 0, note: 'Sister Vane paid, then asked Vesper never to mention the cut rope again.' },
      ],
    },
  ])

  const lore: Array<{
    category: LoreCategory
    name: string
    description: string
    tags: string[]
  }> = [
    {
      category: 'location',
      name: 'Cinderhold',
      description:
        'The largest surviving township in the Reaches, built into the leeward side of a collapsed ' +
        'caldera. Three tiers: the Rim (Ledger money), the Terraces (everyone else), the Undercrofts ' +
        '(everyone else’s debts).',
      tags: ['city', 'ledger', 'home'],
    },
    {
      category: 'faction',
      name: 'The Ledger',
      description:
        'A debt-broking guild that functions as the Reaches’ de facto government. It does not ' +
        'enforce with soldiers; it enforces by withdrawing water credit.',
      tags: ['ledger', 'antagonist', 'cinderhold'],
    },
    {
      category: 'faction',
      name: 'The Hollow Choir',
      description:
        'Ash-masked clerics who control the cisterns and the filtration rites. Publicly neutral, ' +
        'privately the only power the Ledger negotiates with rather than buys.',
      tags: ['clergy', 'water', 'neutral'],
    },
    {
      category: 'npc',
      name: 'Reeve Tallow',
      description:
        'Cinderhold’s road-reeve. Fat, tired, genuinely decent, and about two failed caravans ' +
        'from being made an example of.',
      tags: ['questgiver', 'cinderhold', 'ally'],
    },
    {
      category: 'npc',
      name: 'Corvin Quill',
      description:
        'Vesper’s younger brother, entered as collateral against a debt neither of them agreed ' +
        'to. Last seen working a Ledger filtration crew. Alive as of two seasons ago.',
      tags: ['family', 'ledger', 'personal'],
    },
    {
      category: 'location',
      name: 'The Marrow Road',
      description:
        'The only reliably passable route east out of Cinderhold, cut along a ridge of fossil bone ' +
        'left by the Cinderfall. Caravans do not leave it. Something made one leave it.',
      tags: ['road', 'caravan', 'east'],
    },
    {
      category: 'history',
      name: 'The Cinderfall',
      description:
        'Three hundred years ago the sky burned for nine days. What fell was not ash from any ' +
        'mountain — it fell from above the clouds, and it is still falling.',
      tags: ['history', 'ash', 'mystery'],
    },
    {
      category: 'monster',
      name: 'Ashwalkers',
      description:
        'Things that were people before the ash got into their lungs and kept going. They do not ' +
        'hunt; they follow, patiently, for days.',
      tags: ['undead', 'ash', 'threat'],
    },
  ]

  await db.loreEntries.bulkAdd(
    lore.map((entry) => ({
      ...entry,
      campaignId,
      relatedEntryIds: [],
      firstEncounteredTurn: 0,
    })),
  )

  const opening = [
    {
      role: 'dm' as const,
      content:
        'Ash comes down over Cinderhold like a slow grey snow, and Reeve Tallow is waiting for you ' +
        'under the awning of the road-house with the particular stillness of a man who has already ' +
        'decided to beg.\n\n"Eleven days," he says, before you have fully stopped walking. "The ' +
        'Marrow Road caravan. Full season of clean water, forty barrels, and it never reached ' +
        'Ninefold Gate." He turns a water-token over in his fingers, again and again. "The Ledger ' +
        'has already sent its own people. I would rather you found it first."\n\nBehind him, two ' +
        'Ledger factors in grey are pretending very hard not to listen.\n\nWhat do you do?',
    },
    {
      role: 'player' as const,
      content:
        'I keep my back to the factors and ask Tallow, quietly, who else knew the caravan’s schedule.',
    },
    {
      role: 'dm' as const,
      content:
        'Tallow’s eyes flick past your shoulder and back — he understands exactly why you turned.\n\n' +
        '"Four of us," he murmurs, thumbing the token. "Me. The cistern-master. The caravan-captain, ' +
        'and she is out there somewhere. And the Ledger factor who countersigns the water writ." He ' +
        'lets that last one sit.\n\n"His name is Ossric Fen. He countersigned at dusk, and by ' +
        'midnight he had bought passage west." Tallow finally looks at you properly. "Men who are ' +
        'owed money do not leave. Men who have been paid do."\n\nOne of the grey factors has stopped ' +
        'pretending. He is watching you now, openly, and he has the ledger-seal at his belt turned ' +
        'outward so you can see it.\n\nRoll a Deception check to keep this looking like a ' +
        'conversation about nothing.',
    },
  ]

  let turnIndex = 0
  await db.storyLog.bulkAdd(
    opening.map((entry) => ({
      campaignId,
      turnIndex: turnIndex++,
      role: entry.role,
      content: entry.content,
      timestamp: Date.now() - (opening.length - turnIndex) * 60_000,
    })),
  )

  const narrativeState = await db.narrativeState.where('campaignId').equals(campaignId).first()
  if (narrativeState) {
    await db.narrativeState.update(narrativeState.id, {
      arcSummary:
        'Vesper Quill has taken a job from Reeve Tallow to find a caravan carrying a season of clean ' +
        'water that vanished off the Marrow Road. The Ledger is already searching for it, which means ' +
        'the Ledger either lost it or took it. A factor named Ossric Fen countersigned the water writ ' +
        'and left town the same night. Vesper’s real objective — burning her brother’s name ' +
        'out of the Ledger’s registry — runs straight through the same organisation.',
      unresolvedThreadsJson: [
        'Where did the caravan go after the cart ruts turn east off the Marrow Road?',
        'Who paid Ossric Fen, and is he still alive to be asked?',
        'Corvin Quill is still listed as collateral in the Cinderhold registry.',
        'Sister Vane wants the cut bell-rope at Greyhearth forgotten.',
      ],
      toneNotes:
        'Grim and material. Water is currency. Violence is slow and expensive. Let NPCs be tired ' +
        'rather than evil.',
      pacingNotes:
        'Investigation phase. Two or three more scenes of legwork before the caravan site itself.',
      directorBrief:
        'Press on the Ledger factor watching the conversation — make the player choose between ' +
        'leaving quietly and learning something. Keep Ossric Fen offstage but named. Do not reveal ' +
        'the caravan’s fate this scene.',
      lastUpdatedTurn: 2,
    })
  }

  return campaignId
}

export async function hasAnyCampaign(): Promise<boolean> {
  return (await db.campaigns.count()) > 0
}
