export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const {
      startPlaybackMonitor,
    } = await import("./lib/playback-monitor");

    startPlaybackMonitor();
  }
}
