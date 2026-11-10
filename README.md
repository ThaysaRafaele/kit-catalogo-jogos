# Catálogo dos Jogos

Livro digital com o catálogo anual dos jogos criados pelos estudantes do curso de Programação de Jogos Digitais do CEEP Hércules Maymone, em Campo Grande, MS. Cada edição reúne o documento de design (GDD) e os desenhos de cada jogo.

Edição atual: **Mostra Cultural • LEVEL UP 2026**.

O site é 100% estático e usa só serviços gratuitos. **Não há banco de dados:** todo o conteúdo fica em arquivos JSON neste repositório e é validado a cada build.

> **Projeto em construção.** Hoje o site mostra só as primeiras telas do livro, em sequência, e os botões delas ainda não têm ação. As seções abaixo indicam o que ainda não existe.

## Rodar no computador

É preciso ter o [Node.js](https://nodejs.org) 22.18 ou mais recente.

```bash
npm install
npm run dev
```

Depois, abra <http://localhost:3000>.

| Comando | O que faz |
|---|---|
| `npm run dev` | Abre o site em modo de desenvolvimento |
| `npm run validar` | Confere o conteúdo e lista as pendências |
| `npm run build` | Valida o conteúdo e gera o site na pasta `out/` |
| `npm run typecheck` | Confere os tipos do TypeScript |

## Onde fica cada coisa

```text
content/
  mentores.json                   mentores (valem para todas as edições)
  edicoes/2026/edicao.json        título, abertura, turmas, créditos e agradecimento da edição
  edicoes/2026/jogos/<slug>.json  um arquivo por jogo
public/
  marca/                          logos da escola e do curso
  mentores/<slug-do-nome>.webp    fotos dos mentores
  edicoes/2026/<slug>/            protagonista.webp, antagonista.webp e mundo.webp
entradas/2026/                    PDFs e fotos das fichas (não vão para o repositório)
referencia-design/                protótipo aprovado, a referência do visual
```

### Como o conteúdo é validado

- **Erro que interrompe o build:** JSON malformado, campo obrigatório ausente, edição sem título, jogo sem nome, turma ou mentor repetidos, desenho sem `alt`, `link` que não começa com `http` ou `https`, turma que não existe na edição, ou `slug` diferente do nome do arquivo.
- **Aviso que não interrompe:** `PREENCHER` nos demais campos, lista vazia ou imagem que não existe. `PREENCHER` conta como vazio, então nos campos da regra anterior ele interrompe o build. Uma turma ou um item de lista sem nenhum conteúdo sai da lista. Esses itens não aparecem no site, e a imagem que falta vira um espaço reservado.
- **Autorização de imagem:** o campo `autorizacaoImagem` de cada jogo existe para registrar se os nomes da equipe podem ser publicados. Só use `true` depois de confirmar os termos. *A regra que esconde os nomes quando o valor é `false` ainda será implementada.*

## Adicionar um jogo

1. Crie `content/edicoes/2026/jogos/<slug>.json`, usando `heaven-runner.json` como modelo. O `slug` usa minúsculas, números e hífens, e é igual ao nome do arquivo.
2. Coloque os desenhos em `public/edicoes/2026/<slug>/`, em WebP, com os nomes `protagonista.webp`, `antagonista.webp` e `mundo.webp`.
3. Rode `npm run validar`.

## Adicionar uma edição

1. Crie `content/edicoes/<ano>/edicao.json`, usando o de 2026 como modelo.
2. Adicione os jogos em `content/edicoes/<ano>/jogos/`.

A página inicial abre a edição mais recente que tenha pelo menos um jogo. Na tela de seleção, uma edição sem jogos aparece como "Slot vazio". Uma pasta de ano sem `edicao.json` é ignorada.

Nos créditos finais, o campo opcional `agradecimento` vem depois de "Obrigado a cada estudante que desenhou, programou, testou e apresentou.". Use-o para agradecer às famílias, à escola e aos visitantes. A lista "Créditos da Mostra" usa os `creditos` da edição e termina com uma linha que reúne as turmas.

## Importar as fichas

Coloque os PDFs ou fotos das fichas em `entradas/2026/` e peça ao Claude Code:

> importe as fichas de entradas/2026

Nesse pedido, ele deve:

1. Ler cada PDF ou foto.
2. Gerar o JSON do jogo, validado.
3. Corrigir só a ortografia óbvia, sem mudar o sentido nem o estilo dos estudantes.
4. Escrever o `alt` de cada desenho a partir da ficha ("Quem é?" para personagens e características visuais para o mundo).
5. Converter "Como se joga?" em `controles` (ação e teclas).
6. Listar no final o que ficou em branco ou ilegível.

Confira sempre o resultado antes de publicar.

## Fotos dos mentores

1. Salve a foto em `public/mentores/` em WebP, com o nome indicado no campo `foto` de `content/mentores.json`. Use só minúsculas: a Vercel diferencia maiúsculas, mesmo quando o Windows não diferencia.
2. Recorte a foto em quadrado, com o rosto centralizado. Um lado de 192 px basta, porque ela aparece pequena no card.
3. Rode `npm run validar`. Mentor sem foto usa o avatar provisório.

Fotos originais em `.jpeg`, `.jpg` ou `.png` nessa pasta ficam fora do repositório.

## Publicar na Vercel

O plano gratuito (Hobby) basta. Ele é voltado a uso pessoal e não comercial, então vale conferir os [termos atuais](https://vercel.com/docs/plans/hobby) se o site passar a ser mantido oficialmente pela escola.

### Primeira publicação

1. Entre em <https://vercel.com> com a conta do GitHub dona do repositório.
2. Clique em **Add New… → Project** e importe `kit-catalogo-jogos`.
3. Confirme que o **Framework Preset** é **Next.js** e deixe os demais campos como estão. Nenhuma variável de ambiente é necessária por enquanto.
4. Clique em **Deploy**.

Se a validação do conteúdo encontrar um erro, a publicação falha e o site anterior continua no ar.

### Atualizações

- Cada push na `main` publica o site automaticamente.
- Cada push em outra branch gera um endereço de prévia, que não altera o site oficial.

### Endereço do site

O endereço padrão termina em `.vercel.app`. Para mudá-lo, ou para usar um domínio próprio, acesse **Settings → Domains**.

**Defina o endereço final antes de imprimir qualquer material.** Os QR codes dos jogos vão apontar para ele, então trocá-lo depois invalida os impressos.
