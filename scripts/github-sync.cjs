const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
let token = process.env.GITHUB_TOKEN || '';
let owner = process.env.GITHUB_OWNER || 'ProgramaCerto';
let repo = process.env.GITHUB_REPO || 'gestao';

// 1. Tentar ler de .github_token (ignorado no git)
const tokenFile = path.join(rootDir, '.github_token');
if (!token && fs.existsSync(tokenFile)) {
  token = fs.readFileSync(tokenFile, 'utf8').trim();
}

// 2. Tentar ler de .env (ignorado no git)
const envFile = path.join(rootDir, '.env');
if ((!token || !owner || !repo) && fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const tokenMatch = envContent.match(/GITHUB_TOKEN=[\"']?([^\"'\r\n]+)[\"']?/);
  const ownerMatch = envContent.match(/GITHUB_OWNER=[\"']?([^\"'\r\n]+)[\"']?/);
  const repoMatch = envContent.match(/GITHUB_REPO=[\"']?([^\"'\r\n]+)[\"']?/);
  if (!token && tokenMatch) token = tokenMatch[1].trim();
  if (ownerMatch) owner = ownerMatch[1].trim();
  if (repoMatch) repo = repoMatch[1].trim();
}

if (!token) {
  console.error('[git-sync] Erro: Token do GitHub nao encontrado em .github_token ou .env');
  process.exit(1);
}

const remoteUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;

function ensureGit() {
  if (!fs.existsSync(path.join(rootDir, '.git'))) {
    console.log('[git-sync] Inicializando repositorio git...');
    execSync('git init', { cwd: rootDir, stdio: 'inherit' });
    execSync('git config user.name "Programa Certo"', { cwd: rootDir, stdio: 'inherit' });
    execSync('git config user.email "admin@programacerto.com"', { cwd: rootDir, stdio: 'inherit' });
    execSync(`git remote add origin ${remoteUrl}`, { cwd: rootDir, stdio: 'inherit' });
    execSync('git fetch origin main', { cwd: rootDir, stdio: 'inherit' });
    execSync('git reset --mixed origin/main', { cwd: rootDir, stdio: 'inherit' });
    execSync('git branch -M main', { cwd: rootDir, stdio: 'inherit' });
    execSync('git branch --set-upstream-to=origin/main main', { cwd: rootDir, stdio: 'inherit' });
  } else {
    try {
      execSync(`git remote set-url origin ${remoteUrl}`, { cwd: rootDir, stdio: 'ignore' });
    } catch (e) {
      execSync(`git remote add origin ${remoteUrl}`, { cwd: rootDir, stdio: 'ignore' });
    }
  }
}

const action = process.argv[2] || 'push';
const commitMessage = process.argv[3] || 'feat: atualizacoes do sistema';

ensureGit();

if (action === 'push') {
  console.log('[git-sync] Adicionando arquivos e commitando...');
  execSync('git add -A', { cwd: rootDir, stdio: 'inherit' });
  try {
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: rootDir, stdio: 'inherit' });
  } catch (e) {
    console.log('[git-sync] Nada novo para commitar.');
  }
  console.log('[git-sync] Enviando para o GitHub...');
  execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });
  console.log('[git-sync] Push concluido com sucesso!');
} else if (action === 'pull') {
  console.log('[git-sync] Puxando atualizacoes do GitHub...');
  execSync('git pull origin main', { cwd: rootDir, stdio: 'inherit' });
  console.log('[git-sync] Pull concluido com sucesso!');
}
