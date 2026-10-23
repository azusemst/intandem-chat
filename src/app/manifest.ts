import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "InTandem · USC practice partners", short_name: "InTandem", description: "Find a USC peer to practice and learn together.", start_url: "/matches", scope: "/", display: "standalone", background_color: "#faf8f4", theme_color: "#8a2535", icons: [{ src:"/icon", sizes:"512x512", type:"image/png", purpose:"any" }, { src:"/apple-icon", sizes:"180x180", type:"image/png" }] };
}
