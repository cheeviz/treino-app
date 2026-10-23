# Treino App

Aplicativo web instalável (PWA) para organizar conjuntos de treinos e mantê-los em uma fila local.

## Requisitos
- Node.js 20 ou superior (recomendado)
- npm

## Rodar localmente
```bash
npm install
npm run dev
```
Abra o endereço local mostrado pelo Vite.

## Gerar versão de produção
```bash
npm run build
npm run preview
```
A pasta `dist/` contém os arquivos de produção.

## Instalar no Android
Para instalar como PWA, publique a pasta `dist/` em uma hospedagem HTTPS. Abra o endereço no Chrome do Android e use o menu do navegador > Instalar app / Adicionar à tela inicial. O evento de instalação aparece no app quando o navegador oferece suporte.

## Funcionalidades implementadas
- Criar, renomear e excluir conjuntos.
- Adicionar, editar e excluir exercícios.
- Configurar séries, repetições e descanso em segundos.
- Iniciar sessão e marcar exercícios concluídos.
- Finalizar sessão e mover o conjunto para o fim da fila.
- Reordenar manualmente conjuntos.
- Histórico local de sessões.
- Persistência local com IndexedDB.
- Exportar/importar backup JSON.
- PWA com manifest e service worker.

## Notas
- Os dados são locais por navegador e dispositivo; não há sincronização em nuvem.
- O histórico registra data e quantidade de exercícios marcados, não pesos levantados.
- A primeira abertura inclui conjuntos de exemplo; você pode editá-los ou apagá-los.
