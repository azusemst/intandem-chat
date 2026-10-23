import { ImageResponse } from "next/og";
export const size = { width:512, height:512 };
export const contentType = "image/png";
export default function Icon() { return new ImageResponse(<div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"#8a2535", color:"#fff8e9", fontSize:260, fontFamily:"sans-serif", fontWeight:700, letterSpacing:-24 }}>in</div>, size); }
