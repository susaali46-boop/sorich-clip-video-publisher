import {createServerClient} from "@supabase/ssr"; import {NextResponse,type NextRequest} from "next/server";
export async function middleware(req:NextRequest){
 const nonce=btoa(crypto.randomUUID());
 const csp=["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,`style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,`font-src 'self' data: https://fonts.gstatic.com`,`img-src 'self' data: blob: https://*.supabase.co`,`media-src 'self' blob: https://*.supabase.co`,`connect-src 'self' https://*.supabase.co wss://*.supabase.co`,"object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'","upgrade-insecure-requests"].join('; ');
 const requestHeaders=new Headers(req.headers);requestHeaders.set('x-nonce',nonce);requestHeaders.set('Content-Security-Policy',csp);
 let res=NextResponse.next({request:{headers:requestHeaders}});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(url&&key){const db=createServerClient(url,key,{cookies:{getAll:()=>req.cookies.getAll(),setAll(items){items.forEach(({name,value,options})=>{req.cookies.set(name,value);res.cookies.set(name,value,{...options,httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'});});}}});const {data:{user}}=await db.auth.getUser();if(req.nextUrl.pathname.startsWith('/dashboard')&&!user){const target=req.nextUrl.clone();target.pathname='/login';target.searchParams.set('next','/dashboard');return NextResponse.redirect(target);}}
 res.headers.set('Content-Security-Policy',csp);res.headers.set('Cache-Control',req.nextUrl.pathname.startsWith('/dashboard')?'private, no-store':'public, max-age=0, must-revalidate');return res;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};