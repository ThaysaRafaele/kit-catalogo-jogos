# Catálogo dos Jogos

Livro digital com o catálogo anual dos jogos criados pelos estudantes do curso de Programação de Jogos Digitais do CEEP Hércules Maymone, em Campo Grande, MS. Cada edição reúne o documento de design (GDD) e os desenhos de cada jogo.

Edição atual: **Mostra Cultural • LEVEL UP 2026**.

O catálogo é gerado como páginas estáticas e usa só serviços gratuitos. **Não há banco de dados:** todo o conteúdo fica em arquivos JSON neste repositório e é validado a cada build. Os professores alimentam o catálogo pela [área de administração](#área-de-administração), que grava cada alteração como um commit neste repositório.

## Como o livro funciona

- **Folhear:** os botões ◀ e ▶, as setas do teclado, ou um toque ou arraste na borda externa da página. Home volta para a capa.
- **Ir direto a uma página:** o seletor "PÁG" abaixo do livro lista todas as páginas pelo nome.
- **Endereço da página:** `/2026?p=12` abre na página 12, e `/2026#jogo-<slug>` abre no jogo.
- **Tamanho:** duas páginas acima de 820 px de largura e uma no celular. Toda página tem a mesma altura, a da tela; o que não cabe rola dentro dela.
- **Modo leitura:** todas as páginas em sequência, sem animação. Liga sozinho para quem pede menos movimento no sistema.
- **Leitor de tela:** cada virada é anunciada ("Páginas 15 e 16 de 22: …"), e o foco não se perde ao folhear.

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
| `npm run build` | Valida o conteúdo e gera o site |
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm test` | Roda os testes automáticos da área de administração |
| `npm run admin:senha` | Gera o login de um professor para a área de administração |

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
src/app/admin/, src/lib/admin/    área de administração (src/lib/admin/repositorio.ts fala com o GitHub)
tests/admin/                      testes automáticos do admin (npm test)
entradas/2026/                    PDFs e fotos das fichas (não vão para o repositório)
referencia-design/                protótipo aprovado, a referência do visual
```

### Como o conteúdo é validado

- **Erro que interrompe o build:** JSON malformado, campo obrigatório ausente, edição sem título, jogo sem nome, turma ou mentor repetidos, desenho sem `alt`, `link` que não começa com `http` ou `https`, turma que não existe na edição, ou `slug` diferente do nome do arquivo.
- **Aviso que não interrompe:** `PREENCHER` nos demais campos, lista vazia ou imagem que não existe. `PREENCHER` conta como vazio, então nos campos da regra anterior ele interrompe o build. Uma turma ou um item de lista sem nenhum conteúdo sai da lista. Esses itens não aparecem no site, e a imagem que falta vira um espaço reservado.
- **Autorização de imagem:** com `autorizacaoImagem: false`, os nomes da equipe do jogo não são publicados, nem no código da página. Só use `true` depois de confirmar os termos.

## Adicionar um jogo

O caminho mais simples é a [área de administração](#área-de-administração): **Painel → Novo jogo**. Para fazer à mão:

1. Crie `content/edicoes/2026/jogos/<slug>.json`, usando `heaven-runner.json` como modelo. O `slug` usa minúsculas, números e hífens, e é igual ao nome do arquivo.
2. Coloque os desenhos em `public/edicoes/2026/<slug>/`, em WebP, com os nomes `protagonista.webp`, `antagonista.webp` e `mundo.webp`.
3. Rode `npm run validar`.

## Adicionar uma edição

Pelo admin: **Painel → Criar nova edição**, e depois **Dados da edição** para cadastrar as turmas daquele ano (as turmas não passam de um ano para o outro; os créditos, sim). Para fazer à mão:

1. Crie `content/edicoes/<ano>/edicao.json`, usando o de 2026 como modelo.
2. Adicione os jogos em `content/edicoes/<ano>/jogos/`.

A página inicial abre a edição mais recente que tenha pelo menos um jogo. Uma edição sem jogos não ganha página própria e aparece como "Slot vazio" na tela de seleção. Uma pasta de ano sem `edicao.json` é ignorada.

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

Pelo admin (**Mentores → Editar**), basta escolher a foto: o recorte quadrado de 192 px e a conversão para WebP são automáticos. Para fazer à mão:

1. Salve a foto em `public/mentores/` em WebP, com o nome indicado no campo `foto` de `content/mentores.json`. Use só minúsculas: a Vercel diferencia maiúsculas, mesmo quando o Windows não diferencia.
2. Recorte a foto em quadrado, com o rosto centralizado. Um lado de 192 px basta, porque ela aparece pequena no card.
3. Rode `npm run validar`. Mentor sem foto usa o avatar provisório.

Fotos originais em `.jpeg`, `.jpg` ou `.png` nessa pasta ficam fora do repositório.

## Ícones e imagem de compartilhamento

- O ícone da aba (`src/app/icon.png`) e o da tela inicial do celular (`src/app/apple-icon.png`) saem do logo do curso.
- A imagem que aparece ao compartilhar o link (`src/app/opengraph-image.tsx`) é gerada no build, com o ano da edição mais recente. Ela usa as fontes de `src/app/fontes/` (licença OFL).

## Área de administração

Em `/admin`, os professores alimentam o catálogo por formulário: jogos (com os desenhos), dados da edição (textos, turmas e créditos) e mentores (com foto). Cada professor tem o próprio login.

**O GitHub é o armazenamento.** Cada "Publicar" vira um commit na `main` com o JSON e as imagens, com o nome de quem salvou na mensagem (por exemplo, `conteudo(2026): edita heaven-runner [por Thaysa]`). A Vercel publica sozinha, e o catálogo atualiza em cerca de 2 minutos. Se duas pessoas salvarem a mesma ficha ao mesmo tempo, a segunda recebe "Outra pessoa salvou este conteúdo agora", e o trabalho da primeira não é sobrescrito. Antes de recarregar a página, a segunda pessoa precisa guardar o que digitou: no formulário do jogo, com "Salvar rascunho no navegador"; na edição e nos mentores, copiando o texto, porque essas telas não têm rascunho.

O que o admin cuida sozinho:

- **Desenhos:** reduzidos para no máximo 1600 px e convertidos para WebP ainda no navegador. No servidor, o tipo real do arquivo é conferido e os metadados (como a localização das fotos de celular) são removidos. O botão "Clarear fundo do papel" ajuda com scans acinzentados.
- **Validação:** as mesmas regras do build, com as mensagens em português ao lado de cada campo. O servidor nunca grava um JSON que quebraria o build. Campo em branco vira pendência no painel, não erro.
- **Turmas:** renomear uma turma leva os jogos dela junto; remover uma turma que ainda tem jogos é recusado.
- **Rascunho:** o formulário do jogo guarda um rascunho no navegador, para não perder o que foi digitado.

### Criar o token do GitHub

O admin grava no repositório com um token pessoal *fine-grained*, com a permissão mínima:

1. No GitHub, abra **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Token name:** `admin-catalogo`. **Expiration:** a mais longa permitida (até 1 ano). **Anote a data de vencimento na agenda**: quando o token vence, o admin para de publicar ("Token do GitHub inválido ou expirado") até um token novo entrar no lugar.
3. **Repository access:** *Only select repositories* → `kit-catalogo-jogos`.
4. **Permissions → Repository permissions → Contents:** *Read and write*. Nenhuma outra (o *Metadata: Read-only* entra sozinho).
5. Clique em **Generate token** e copie o valor, que só aparece uma vez.

Para renovar, gere um token novo do mesmo jeito, troque o `GITHUB_TOKEN` na Vercel e faça um **Redeploy**.

### Configurar na Vercel

Em **Settings → Environment Variables**, cadastre as variáveis abaixo **só para o ambiente Production**. Nas prévias (outras branches), o admin fica sem configuração de propósito: uma prévia não deve gravar na `main`.

| Variável | Valor |
|---|---|
| `GITHUB_TOKEN` | o token criado acima |
| `GITHUB_OWNER` | `ThaysaRafaele` |
| `GITHUB_REPO` | `kit-catalogo-jogos` |
| `GITHUB_BRANCH` | `main` |
| `ADMIN_SESSAO_SEGREDO` | um texto aleatório de **pelo menos 32 caracteres**, gerado com o comando abaixo |
| `ADMIN_USUARIOS` | a lista dos professores (veja a seção seguinte) |

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Depois de salvar as variáveis, abra **Deployments**, clique nos três pontos do último deploy e escolha **Redeploy**: as variáveis só valem a partir do deploy seguinte.

### Adicionar e remover um professor

Para adicionar:

1. No computador, rode `npm run admin:senha` e responda usuário, nome (vai nas mensagens de commit) e senha (mínimo de 10 caracteres; ela não aparece enquanto é digitada).
2. Copie o item impresso, `{"usuario":…,"nome":…,"hash":…}`, para dentro da lista `[ ]` de `ADMIN_USUARIOS` na Vercel, separando os professores por vírgula.
3. Faça um **Redeploy**.

A senha nunca fica salva: só o hash dela, com scrypt.

Para remover, apague o item do professor em `ADMIN_USUARIOS` e faça um **Redeploy**. O acesso acaba assim que o deploy termina, mesmo para quem estava logado: a cada pedido, o admin confere se a pessoa ainda está na lista.

Para trocar uma senha, gere a linha de novo com `npm run admin:senha` e substitua o item antigo.

### Testar no computador

Com `ADMIN_MODO=local`, o admin grava direto em `content/` e `public/`, sem commit. Crie o arquivo `.env.local` na raiz (ele fica fora do repositório):

```bash
ADMIN_MODO=local
ADMIN_SESSAO_SEGREDO=<texto aleatório de pelo menos 32 caracteres>
ADMIN_USUARIOS='[{"usuario":"…","nome":"…","hash":"scrypt:…"}]'
```

Use **aspas simples** em volta da lista. Rode `npm run dev`, abra <http://localhost:3000/admin> e entre com o login gerado por `npm run admin:senha`. Com um segredo menor que 32 caracteres, o login responde "O login do admin não está configurado no servidor".

Como as alterações vão para os arquivos do projeto, confira o `git status` antes de cada commit e desfaça o que for teste:

```bash
git restore content public                # desfaz o que foi alterado em arquivos que já existiam
git clean -nd -- content public           # lista os arquivos novos (jogos, desenhos, fotos)...
git clean -fd -- content public           # ...e apaga esses arquivos novos
```

Confira a lista do `git clean -nd` antes de apagar: ele também apaga conteúdo novo de verdade que ainda não foi commitado. As fotos originais dos mentores (`.jpeg`, `.png`) ficam fora do repositório e não são apagadas.

O modelo de todas as variáveis está em `.env.example`. Para rodar os testes automáticos: `npm test`.

### Limitações conhecidas

- Um desenho ou foto recém-publicado aparece no site só depois do deploy (cerca de 2 minutos). Até lá, a tela do admin mostra a prévia local.
- O limite de senhas erradas, a cada 15 minutos, é de 5 para o mesmo usuário vindo do mesmo endereço de internet, e de 30 por endereço, somando todos os usuários. A conta não trava sozinha: quem tenta de muitos endereços diferentes não é barrado por esse limite. A proteção, nesse caso, é a senha de pelo menos 10 caracteres, guardada em hash scrypt, que é lento de propósito. A contagem fica na memória do servidor, e cada instância da Vercel tem a sua.
- A Vercel limita cada envio ao servidor a 4,5 MB. Por segurança, quando a ficha e os desenhos juntos passam de 3,5 MB, o admin publica a ficha primeiro e depois envia um desenho por vez, com um commit para cada. Cada arquivo, sozinho, pode ter até 4 MB depois de reduzido no navegador.

### Futuro: GitHub App da organização

Hoje o admin usa um token pessoal. Para passar a usar um GitHub App de uma organização (sem depender da conta de uma pessoa nem de renovar o token), **só mudam `src/lib/admin/repositorio.ts` e as variáveis de ambiente**:

1. Crie o App na organização, com a permissão *Contents: Read and write*, e instale-o só neste repositório.
2. Troque `GITHUB_TOKEN` por `GITHUB_APP_ID`, `GITHUB_APP_CHAVE_PRIVADA` e `GITHUB_APP_INSTALACAO_ID`.
3. Na função `cabecalhosAutenticacao` de `repositorio.ts`, gere o token de instalação do App (o passo a passo está no comentário do topo do arquivo).

Os commits passam a aparecer como feitos pelo App, e a mensagem continua com o nome de quem salvou.

## Publicar na Vercel

O plano gratuito (Hobby) basta. Ele é voltado a uso pessoal e não comercial, então vale conferir os [termos atuais](https://vercel.com/docs/plans/hobby) se o site passar a ser mantido oficialmente pela escola.

### Primeira publicação

1. Entre em <https://vercel.com> com a conta do GitHub dona do repositório.
2. Clique em **Add New… → Project** e importe `kit-catalogo-jogos`.
3. Confirme que o **Framework Preset** é **Next.js** e deixe os demais campos como estão. Em **Output Directory**, não preencha nada (o padrão do Next.js).
4. Cadastre as variáveis da área de administração (veja [Configurar na Vercel](#configurar-na-vercel)).
5. Clique em **Deploy**.

Se a validação do conteúdo encontrar um erro, a publicação falha e o site anterior continua no ar.

### Atualizações

- Cada push na `main` publica o site automaticamente, inclusive os commits feitos pela área de administração.
- Cada push em outra branch gera um endereço de prévia, que não altera o site oficial.

### Endereço do site

O endereço padrão termina em `.vercel.app`. Para mudá-lo, ou para usar um domínio próprio, acesse **Settings → Domains**.

**Defina o endereço final antes de imprimir qualquer material.** O QR code do catálogo aponta para ele, então trocá-lo depois invalida os impressos. A página inicial sempre abre a edição mais recente, então o mesmo QR code serve para os anos seguintes.
