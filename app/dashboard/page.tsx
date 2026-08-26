import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unseal, type SpotifySession } from "@/lib/session";
import { spotifyGet, validSession, type Device, type Playback, type Profile } from "@/lib/spotify";

type DashboardData = { profile: Profile | null; playback: Playback | null; device: Device | undefined };

async function loadDashboard(session: SpotifySession): Promise<DashboardData | null> {
  try {
    const valid = await validSession(session);
    const [profile, playback, devices] = await Promise.all([
      spotifyGet<Profile>("/me", valid.accessToken),
      spotifyGet<Playback>("/me/player/currently-playing", valid.accessToken),
      spotifyGet<{ devices: Device[] }>("/me/player/devices", valid.accessToken),
    ]);
    return { profile, playback, device: devices?.devices.find((item) => item.is_active) };
  } catch {
    return null;
  }
}

export default async function Dashboard() {
  const raw = (await cookies()).get("rundj_session")?.value;
  const session = raw ? unseal<SpotifySession>(raw) : null;
  if (!session) redirect("/?error=session");
  const data = await loadDashboard(session);
  if (!data) return <main className="grid min-h-screen place-items-center bg-[#07140f] p-6 text-center text-white"><div><h1 className="text-3xl font-black">Spotify needs reconnecting</h1><a className="mt-6 inline-block rounded-full bg-[#1ed760] px-6 py-3 font-bold text-[#061109]" href="/api/auth/spotify">Reconnect Spotify</a></div></main>;

  const track = data.playback?.item;
  return <main className="min-h-screen bg-[#07140f] px-6 py-8 text-[#f4f8f4]"><nav className="mx-auto flex max-w-3xl justify-between"><b>Run<span className="text-[#1ed760]">DJ</span></b><form action="/api/auth/logout" method="post"><button>Disconnect</button></form></nav><section className="mx-auto max-w-3xl py-14"><p className="font-bold tracking-[.18em] text-[#1ed760]">RUNNER DASHBOARD</p><h1 className="mt-3 text-4xl font-black">Hi, {data.profile?.display_name ?? data.profile?.id ?? "runner"}.</h1><div className="mt-10 grid gap-5 md:grid-cols-2"><article className="rounded-3xl bg-white/5 p-6 md:col-span-2"><p className="text-xs font-bold tracking-widest text-[#8da393]">NOW PLAYING</p><h2 className="mt-4 text-2xl font-bold">{track?.name ?? "Nothing is playing"}</h2><p className="mt-1 text-[#b6c7bb]">{track?.artists.map((artist) => artist.name).join(", ") ?? "Start Spotify on a device to see your track."}</p></article><article className="rounded-3xl bg-white/5 p-6"><p className="text-xs font-bold tracking-widest text-[#8da393]">PLAYBACK</p><p className="mt-4 text-xl font-bold">{data.playback?.is_playing ? "Playing" : "Paused"}</p></article><article className="rounded-3xl bg-white/5 p-6"><p className="text-xs font-bold tracking-widest text-[#8da393]">ACTIVE DEVICE</p><p className="mt-4 text-xl font-bold">{data.device?.name ?? "No active device"}</p><p className="text-sm text-[#b6c7bb]">{data.device?.type ?? "Open Spotify, then start playback."}</p></article></div></section></main>;
}
