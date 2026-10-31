// Bench of ai-exitsleeping's server memory structures at 100k and 1M bodies (natives stubbed): `bun run bench`.
const sent = { events: 0, views: 0 };
Object.assign(globalThis, {
  emitNet: (_n: string, _s: number, ...args: unknown[]) => {
    sent.events++;
    for (const a of args) if (Array.isArray(a)) sent.views += a.length;
  },
  GetHashKey: () => 1885233650,
  GetCurrentResourceName: () => "ai-exitsleeping",
  on: () => undefined,
  onNet: () => undefined,
  emit: () => undefined,
  setTick: () => 1,
  clearTick: () => undefined,
  RegisterCommand: () => undefined,
  GetConvar: (_: string, fallback: string) => fallback,
  IsDuplicityVersion: () => true,
  exports: new Proxy(() => undefined, {
    get: () => new Proxy({}, { get: () => () => undefined }),
  }),
});

const { AreaStream } = await import("@aicore-fivem/lib/server");
const { Sleeper } = await import("server/sleeper");
const { inAnyArea, readArea } = await import("common/areas");
const { CELL } = await import("common/events");
const { gridCell, readRecords } = await import("@aicore-fivem/lib/shared");

const time = (label: string, fn: () => void) => {
  const t = performance.now();
  fn();
  console.log(`  ${label}: ${(performance.now() - t).toFixed(1)} ms`);
};
// Map of GTA V: about -4000..4500 x, -4000..8000 y.
const randomX = () => Math.random() * 8500 - 4000;
const randomY = () => Math.random() * 12000 - 4000;

const areas = readRecords(
  {
    a: { shape: "sphere", center: { x: 300, y: -600, z: 30 }, radius: 80 },
    b: {
      shape: "cylinder",
      center: { x: -500, y: 200, z: 30 },
      radius: 120,
      height: 20,
    },
    c: {
      shape: "poly",
      height: 30,
      corners: [
        { x: 0, y: 0, z: 30 },
        { x: 400, y: 0, z: 30 },
        { x: 400, y: 400, z: 30 },
        { x: 0, y: 400, z: 30 },
      ],
    },
  },
  readArea,
);

for (const N of [100_000, 1_000_000]) {
  console.log(`N = ${N}`);
  type S = InstanceType<typeof Sleeper>;
  const byId = new Map<number, S>();
  const stream = new AreaStream<S, ReturnType<S["view"]>>({
    event: "bench",
    view: (s) => s.view(),
    cellSize: CELL,
    chunk: 20,
  });
  const at = new Map<number, { cx: number; cy: number }>();
  const heap0 = process.memoryUsage().heapUsed;
  time("create + file", () => {
    for (let i = 1; i <= N; i++) {
      const s = new Sleeper(
        i,
        1885233650,
        0,
        randomX(),
        randomY(),
        30,
        0,
        Date.now(),
      );
      byId.set(i, s);
    }
    stream.load(byId.values());
  });
  console.log(
    `  heap: ${((process.memoryUsage().heapUsed - heap0) / 1e6).toFixed(0)} MB`,
  );
  sent.events = 0;
  sent.views = 0;
  time("2048 players watch (fresh)", () => {
    for (let p = 1; p <= 2048; p++) {
      const cell = gridCell(randomX(), randomY(), CELL);
      at.set(p, cell);
      stream.follow(p, cell.cx, cell.cy);
    }
  });
  console.log(
    `  -> ${sent.events} events, ${sent.views} views (${(sent.views / 2048).toFixed(1)} per player)`,
  );
  time("2048 players move one cell", () => {
    for (const [p, { cx, cy }] of at) stream.follow(p, cx + 1, cy);
  });
  let hidden = 0;
  time(`area change: re-check every body (${areas.size} areas)`, () => {
    for (const s of byId.values())
      if (inAnyArea(areas.values(), s.x, s.y, s.z)) hidden++;
  });
  console.log(`  -> ${hidden} inside`);
  let expired = 0;
  time("expiry walk", () => {
    const limit = Date.now() - 3 * 86_400_000;
    for (const s of byId.values()) if (s.loggedOutAt < limit) expired++;
  });
}
