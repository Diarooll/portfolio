# Diego Olalla · portfólio

Site pessoal em Next.js 15 (App Router) + TypeScript + Tailwind CSS v4, com cenas 3D em React Three Fiber.
O conteúdo é em inglês (padrão, em `/`) e português (`/pt`).

O site estático antigo (HTML/CSS/JS) está guardado em `legacy/`, e o protótipo aprovado do redesign em `prototype/`.

## Rodar

Precisa de Node 22.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # versão de produção
```

Outros comandos:

| comando             | o que faz                         |
| ------------------- | --------------------------------- |
| `npm run lint`      | ESLint                            |
| `npm run typecheck` | `tsc --noEmit`                    |
| `npm test`          | testes (Vitest + Testing Library) |
| `npm run format`    | Prettier                          |

Para revisar o movimento: `?motion=reduced` mostra a versão calma (a mesma de quem pede menos movimento no sistema)
e `?motion=full` força a coreografia completa.

## Onde fica cada coisa

```
src/app/[locale]/       página, layout, metadados e imagem Open Graph por idioma
src/components/sections Hero, Sobre, Stack, Projetos, Jornada, Contato, Footer
src/components/three    cenas 3D (árvore da Stack, folhas, galho do Contato)
src/components/landscape paisagem em camadas e transição de nuvens
src/components/ui       barra, botões, dissolve de texto, passarinho...
src/content/            dados tipados: site.ts, techs.ts, projects.ts, journey.ts
src/lib/                motor de rolagem, paisagem, matemática, forma do galho
messages/pt.json, en.json  textos da interface
```

**Antes de publicar:** troque o e-mail e o link do LinkedIn em `src/content/site.ts` (estão marcados com `TODO`).

## Paisagem em camadas (como trocar as fotos)

O fundo é uma foto recortada em camadas com o **mesmo enquadramento 16:9**, empilhadas em `position: fixed`
com `z-index` intercalado com o conteúdo. Cada camada anda numa velocidade diferente com a rolagem e o cursor
(só `transform`, barato para a GPU). O nome grande do hero fica entre `far` e `front`, então o morro passa
na frente das letras.

| arquivo em `public/landscape/` | o que é                        | transparência |
| ------------------------------ | ------------------------------ | ------------- |
| `sky.webp`                     | céu com nuvens                 | opaco         |
| `far.webp`                     | morros distantes               | transparente  |
| `front.webp`                   | morro + a árvore grande        | transparente  |
| `grass.webp`                   | grama da frente (opcional)     | transparente  |
| `cloud-a.webp`, `cloud-b.webp` | bordas das nuvens da transição | transparente  |

Para trocar uma camada:

1. Exporte o novo recorte com o **mesmo tamanho e enquadramento** das outras (hoje 1672×941) e salve por cima do arquivo, com o mesmo nome.
2. Se a proporção mudar, atualize `width`/`height` em `src/lib/landscape.ts`.
3. Ajuste em `LAYERS` (mesmo arquivo), se quiser: `depth` (velocidade na rolagem; 1 = acompanha o chão),
   `mouse` (paralaxe do cursor, em px) e `z` (ordem). `FRAME.position` controla o recorte no celular
   (hoje `70% 100%`, para a árvore aparecer) e `FRAME.bleed` a sobra em volta da tela.
4. Abaixo da foto, o verde continua e vira terra (`GROUND` em `landscape.ts` e `.ls-ground` no CSS). Se a cor da
   borda de baixo da grama mudar, atualize a primeira cor do gradiente de `.ls-green` em `src/app/globals.css`.

As nuvens da transição são procedurais: `npm run landscape:clouds` gera `cloud-a/b.webp` de novo
(o script nunca apaga um arquivo que já existe, a não ser com `--force`; `--placeholders` recria camadas provisórias).

## Notas técnicas

- **Motor de rolagem** (`src/lib/scroll-engine.ts`): um só `requestAnimationFrame` para a página. As seções se
  registram, o motor mede tudo no resize, e cada componente escreve estilos direto no DOM. Lenis suaviza a rolagem
  só com mouse e no modo completo. O laço para quando a aba fica escondida.
- **3D** só carrega no navegador (`next/dynamic` com `ssr: false`) e por seção: a árvore quando a Stack se aproxima,
  o galho quando o Contato se aproxima, e as folhas depois da primeira interação. Sem WebGL, a árvore e o galho
  viram SVG e a página continua completa.
- **Acessibilidade**: link para pular a navegação, marcos (`header`, `nav`, `main`, `footer`), foco visível,
  as tecnologias da árvore são botões de verdade (setas giram a árvore), o passarinho é um botão, e os textos que se
  dissolvem têm uma cópia inteira para leitores de tela.
- `three` está fixado em 0.182 (o 0.183+ escreve um aviso de depreciação do `THREE.Clock` no console pelo R3F).

## Deploy (Vercel)

O preset do projeto na Vercel precisa ser **Next.js** (o site antigo usava "Other"). Defina `NEXT_PUBLIC_SITE_URL`
se o domínio final não for o da Vercel.
