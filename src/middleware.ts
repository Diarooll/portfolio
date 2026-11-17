import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // tudo menos API, arquivos internos do Next e arquivos com extensão (imagens, ícones...)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
