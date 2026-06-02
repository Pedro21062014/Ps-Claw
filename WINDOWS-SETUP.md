# 🪟 PS Claw no Windows — Guia Rápido

## ⚡ Forma mais fácil (1 minuto)

### Opção 1: PowerShell (recomendado)

1. **Abra o PowerShell como Administrador**
   - Clique no ícone do Windows → digite `powershell` → clique direito → "Executar como administrador"

2. **Execute este comando:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force; npm install -g ps-claw@latest; npx ps-claw web
   ```

Pronto! A interface abre em **http://localhost:3000** 🎉

### Opção 2: Usando o script PowerShell

1. Baixe este arquivo: [install-windows.ps1](https://github.com/Pedro21062014/ps-claw-v2/raw/main/install-windows.ps1)

2. Abra PowerShell como Administrador

3. Execute:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
   & "C:\Users\SEUNOME\Downloads\install-windows.ps1"
   ```

4. Feche e abra um **novo PowerShell** (importante!)

5. Agora funciona:
   ```powershell
   ps-claw web
   ```

### Opção 3: Sem instalação (mais simples)

```powershell
npx ps-claw@latest web
```

Não precisa instalar, funciona direto! ✅

---

## ✅ Testou?

Abra http://localhost:3000 e:

1. Vá para **🔑 API Keys**
2. Cole uma chave (ex: Gemini é grátis!)
3. Vá para **🤖 Modelos** → selecione um
4. Volte para **💬 Chat** → comece a conversar!

---

## 🆘 Erro: "ps-claw não é reconhecido"

**Solução:** Use `npx ps-claw web` em vez disso. Funciona sempre.

Se quiser que `ps-claw` funcione direto, siga a **Opção 2** acima (leva 2 minutos).

---

## 🔧 Troubleshooting

### "Execution of scripts is disabled"

Execute no PowerShell (como admin):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "localhost:3000 recusou conexão"

A porta 3000 está em uso. Mude para:
```powershell
$env:PS_CLAW_WEB_PORT=3001; npx ps-claw web
```

Depois acesse http://localhost:3001

---

Qualquer dúvida, abra uma issue no GitHub! 🦞
