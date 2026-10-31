# ai-exitsleeping

A player who logs out (drop or back to the character screen) stays in the world as a sleeping body where they left; others can carry it, put it into a vehicle seat and take it out again, and the owner wakes up where the body ended up. Port of tgiann-exit-sleeping. Depends on ai-core (characters, unload / load events, points, panel, offline spawn point); looks come through ai-core's appearance layer (any supported clothing script, optional).

## Decisions

- Bodies are local peds on every client, fed by server data (as in the original): nothing networked, so strict entity lockdown, server entity counts and ownership migration never matter. The server only keeps records; a vehicle seat taken by a body is known from those records.
- Server memory is the truth, streamed by 64 m cell with lib `AreaStream` (`alsoTo` = the carrier, so a carried body always reaches them; hidden bodies stay out of the stream). The client's lib `AreaFollower` sends its cell when it changes (checked against the ped, `actions.ts`) and gets what entered / left the 3x3 cells around it; after that only puts and removes, all on one event (`areaDelta`) in chunks of 20 views (a latent event could overtake later puts). Measured with natives stubbed (`bun run bench`, `bench/store.bench.ts`): 1M bodies = ~90 MB heap, a fresh 3x3 snapshot ~0.17 ms and ~360 views per player, 2048 players changing cell at once 190 ms, a hidden-area re-check (an admin edit) 60 ms, the expiry walk 10 ms.
- The look is never copied: the server reads it through lib `appearance.get` when a client first creates that body's ped (LRU of 2000, concurrent asks share one read) and the client asks for it once per body (`EVENTS.look`, ids asked within 100 ms go as one call of up to 20, 5 calls/s, so a crowd of bodies spawning together is never refused) and puts it on with lib `appearance.apply`, so cell deltas stay small. Model: the look's model hash (taken at logout), else the freemode model of the character's sex; stored as text (a hash; a model name is read too).
- Ground bodies are lib `LocalPed`s plus a lib `Points` "carry" point. Carried / seated bodies are lib `LocalPed`s with `attach` / `seat` (`client/attached.ts`): a `LocalPed` spawns by distance to a fixed point, so these get a distance larger than the map and a 500 ms check owns their life (parent within the spawn distance, made again when the attachment or seat is lost).
- Put in / take out are lib vehicle points (`points.addVehicle`: a prompt at the nearest vehicle, or a target option on every vehicle), added only while carrying or while a known body sits in a vehicle, so the vehicle scan runs only then.
- The owner's spawn point follows the body (the original's framework position write): lib `characters.setOfflinePosition` when a body goes back to the ground (put down, carrier left, vehicle gone) and at each 10 s flush for carried / seated bodies that moved. ai-core spawns the character there; the wake callback only removes the body and seats the player in the same seat / moves them to the carrier (server, retried 15 s). No client teleport.
- Hidden areas (panel records: ball, cylinder, or a polygon drawn with the panel `zone` widget; read per record with `panel.records` into lib `ZoneShape`s, tested with `zoneContains`) are server-side: no body is created inside; a ground body inside (put down, or an area drawn later) is filed nowhere, so nobody sees it, but its record stays and the owner still wakes up there.
- Bodies live only in the shared world (bucket 0): carrying starts, a seated body is taken out or put in, and a carried / seated body follows its carrier only while that player or vehicle is in bucket 0 (`worldPed`); inside an instanced interior the body keeps its last bucket-0 position and is put down there.
- "Ignore private worlds" stands in for the original's tgiann-motel hook: in a routing bucket other than 0 a player leaves no body and the server streams none to them (checked on each cell message).
- Runtime states are never stored: a restart puts every body on the ground at its last flushed position.
- Character unloads come through lib `onCharacter` (it ends the player's cell watch too: watching needs a character); client input through lib readers (`readId`, `readInt`, `oneArg`), vehicles through `vehicleFromNet` / `vehicleNearPlayer`.

## Contracts

- Events, callbacks, local hook events: `resource/common/events.ts`. Table `ai_exitsleeping_sleepers` (`sql/main.sql`).
- Server export `AddCreateCheck(id, fn(source, charId, coords) => boolean)`: false leaves no body.
- Client exports `PlayerLoaded()` (wake mode "export"), `SetHidden(reason, hidden)`, `SetCarryBlocked(reason, blocked)`; reasons are kept per calling resource and dropped when it stops.
- Looks through lib `appearance` (server `get`, client `apply`): `docs/compat/appearance.md`.
- Panel: `data/settings.json` (`sync: "all"`, read by clients through `AdminWorld`), `data/areas.json` (server only).

## Pitfalls

- `createSleeping` reads the ped and the character before its first await: on a drop the ped is gone right after ai-core's unload event.
- A body moved across a cell by tracking is only sent to players who newly see it: carried / seated peds render relative to their parent, so the others need no new coordinates.
- Leaving a private world without changing cell shows the bodies only after the next cell change.
- A carried body is attached with `LocalPed`'s rotation sync on (`AttachEntityToEntity` last argument true; the original passed false): check the carry pose in game.
- A player who wakes within the 10 s flush of a carried / seated body whose vehicle or carrier is gone spawns at the last flushed spot.

## Entry points

- Server: memory and deltas `resource/server/store.ts`, creation and create checks `create.ts`, client actions `actions.ts`, waking `wake.ts`, lifecycle (unload, tracking, flush, expiry, test command `/exitsleeptest`) `index.ts`.
- Client: received bodies `client/view.ts`, ground peds and the carry point `ground.ts`, carried / seated peds `attached.ts`, carry session and drop key `carry.ts`, vehicle points `vehiclePrompts.ts`, export reasons `rules.ts`.
- Bench: `bench/store.bench.ts` (`bun run bench`).
