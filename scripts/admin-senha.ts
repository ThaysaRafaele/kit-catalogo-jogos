/**
 * Gera a linha de um professor para a variável ADMIN_USUARIOS.
 * Uso: npm run admin:senha
 * A senha não aparece na tela enquanto é digitada e não fica salva em lugar nenhum.
 */
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { gerarHash } from "../src/lib/admin/senha.ts";

let mudo = false;
const saida = new Writable({
  write(pedaco, codificacao, pronto) {
    if (!mudo) process.stdout.write(pedaco, codificacao);
    pronto();
  },
});
const rl = createInterface({ input: process.stdin, output: saida, terminal: true });

async function perguntarSenha(pergunta: string): Promise<string> {
  process.stdout.write(pergunta);
  mudo = true;
  const resposta = await rl.question("");
  mudo = false;
  process.stdout.write("\n");
  return resposta;
}

const usuario = (await rl.question("Usuário (para o login, ex.: thay): ")).trim().toLowerCase();
const nome = (await rl.question("Nome (vai nas mensagens de commit, ex.: Thaysa): ")).trim();
const senha = await perguntarSenha("Senha (mínimo 10 caracteres): ");
const confirmacao = await perguntarSenha("Repita a senha: ");
rl.close();

if (!/^[a-z0-9._-]+$/.test(usuario)) {
  console.error("Usuário só pode ter letras minúsculas, números, ponto, hífen e sublinhado.");
  process.exit(1);
}
if (!nome) {
  console.error("O nome não pode ficar vazio.");
  process.exit(1);
}
if (senha.length < 10) {
  console.error("A senha precisa ter pelo menos 10 caracteres.");
  process.exit(1);
}
if (senha !== confirmacao) {
  console.error("As senhas não conferem.");
  process.exit(1);
}

const linha = JSON.stringify({ usuario, nome, hash: await gerarHash(senha) });
console.log("\nCole este item dentro da lista [ ] de ADMIN_USUARIOS (separe os professores com vírgula):\n");
console.log(linha);
console.log("\nCom um professor só, a variável fica assim:\n");
console.log(`[${linha}]`);
