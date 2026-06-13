# SupZIP

Compressor de código-fonte que usa **CDC (Content-Defined Chunking)** + **deduplicação SHA-256** + **dicionários por linguagem** para atingir **10–100x+** de compressão em projetos de código.

## CLI

```bash
npx tsx src/cli.ts pack ./meu-projeto -o projeto.supz
npx tsx src/cli.ts unpack projeto.supz -o ./extraido
```

Requer Node 18+ e opcionalmente [`zstd`](https://github.com/facebook/zstd) (para dicionários).

## Playground Web

▶️ **[Abrir playground](playground/)** — roda 100% no navegador, sem instalação.

## Deploy

### Vercel (1 clique)

```bash
npx vercel --prod
```

Ou importe o repositório no [vercel.com/new](https://vercel.com/new).

### GitHub Pages

Habilite GitHub Pages apontando para a branch `main`, pasta raiz.

## Licença

MIT
