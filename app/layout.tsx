import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"Sorich Studio — Creator workspace",description:"A secure workspace for video, content preparation and publishing.",applicationName:"Sorich Studio"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}