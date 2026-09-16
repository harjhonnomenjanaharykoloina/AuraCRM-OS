import { handlers } from "@/auth";

export const GET = handlers.GET;

export async function POST(req: Request) {
	const clonedReq = req.clone();
	const bodyText = await clonedReq.text().catch(() => "");

	if (process.env.NODE_ENV !== "production" && bodyText) {
		const isSignInUsername = req.url.includes("sign-in/username");
		if (isSignInUsername) {
			console.log("[AUTH][signIn.username] Incoming request:", {
				url: req.url,
				body: bodyText,
				contentType: req.headers.get("content-type"),
			});
		}
	}

	return handlers.POST!(req);
}
