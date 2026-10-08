# OlariaFlow — Gestão de Produção & Queima Cerâmica

**OlariaFlow** é uma plataforma gerencial e de Business Intelligence (BI) desenvolvida sob medida para olarias e indústrias de cerâmica vermelha (telhas, tijolos e blocos cerâmicos). O sistema centraliza o controle de queima dos fornos industriais, apuração de rendimento útil (Enforna × Desenforna) e diagnóstico detalhado de causas de perdas.

---

## 🌟 Principais Funcionalidades

### 1. Importação Inteligente de Planilhas Excel (.xlsx)
- Leitura automatizada das abas de fornos (`FORNO 01` a `FORNO 05`) e consolidadas (`RESULTADO`).
- Mapeamento flexível de cabeçalhos mesmo com pequenas variações de nomenclatura.
- **Separação Rigorosa de Estoque**: Leitura das colunas de reconciliação de estoque (*A MENOS*, *A MAIS* e *peça +/-*) como campo independente (`diferenca`), garantindo que variações físicas de contagem não interfiram nas perdas reais da queima.

### 2. Painel Executivo de Indicadores (KPIs)
- **Produção Total — Enforna**: Volume de peças cruas alimentadas em cada câmara.
- **Produção Total — Desenforna**: Volume de peças de 1ª qualidade aproveitadas.
- **Perdas Totais**: Apuração exata das peças descartadas ou reclassificadas durante a queima.
- **Eficiência e Aproveitamento (%)**: Taxa de rendimento útil em relação à enforna.

### 3. Diagnóstico de Causas de Defeito
- Acompanhamento das 4 principais causas da cerâmica estrutural:
  - **Trinca** (choque térmico ou secagem irregular)
  - **2ª Linha / Segunda** (defeitos estéticos ou leve empeno)
  - **Crua** (temperatura insuficiente de maturação)
  - **Quebra** (manuseio, empilhamento ou quebra mecânica)

### 4. Comparativo Mensal de Desempenho
- Seleção direta de dois meses diferentes (**Mês A** vs **Mês B**) com botão de inversão rápida.
- Gráficos de barras agrupadas comparativos de desempenho:
  - Visão Geral (Volume Enfornado, Desenforna Útil e Perdas).
  - Produção e Eficiência por Forno (Forno 1 a 5).
  - Evolução das Causas de Perda.
- Cálculo da **Variação Percentual de Produtividade Útil** com destaque executivo.

### 5. Modo Apresentação & Exportação PDF
- Layout em tela cheia otimizado para TVs e monitores de chão de fábrica.
- Exportação completa em formato PDF ou impressão direta com todas as abas empilhadas sequencialmente.

### 6. Segurança e Controle de Acesso
- **Autenticação Administrativa**: Proteção por senha com hash PBKDF2 com Salt criptográfico (sem armazenamento de senhas em texto puro).
- **Proteção Contra Força Bruta**: Bloqueio progressivo de IP após tentativas consecutivas incorretas.
- **Rate Limiting**: Limite de requisições por IP na API para evitar sobrecarga.
- **Tokens de Sessão**: Uso exclusivo de tokens temporários (`x-admin-token`), sem exposição de senhas no cliente.

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn

### Instalação
```bash
# Instalar dependências
npm install --legacy-peer-deps
```

### Desenvolvimento
```bash
# Iniciar servidor de desenvolvimento (Express + Vite)
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

### Produção
```bash
# Compilar frontend
npm run build

# Iniciar servidor em produção
npm start
```

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

| Variável | Descrição | Padrão |
| :--- | :--- | :--- |
| `PORT` | Porta HTTP do servidor | `3000` |
| `ADMIN_INITIAL_PIN` | Senha inicial do administrador (mínimo 6 caracteres) | Gerada aleatoriamente nos logs se vazia |
| `APP_URL` | URL pública da aplicação | Automático |

---

## 📁 Estrutura do Projeto

```
olariaflow/
├── data/                      # Dados persistidos e backups locais (ignorado no git)
├── src/
│   ├── components/            # Componentes visuais React (Tabelas, Gráficos, Modais)
│   ├── data/                  # Dados iniciais e estruturas base
│   ├── utils/
│   │   ├── calculations.ts    # Cálculos estatísticos, métricas e comparativos
│   │   └── fileParser.ts      # Parser e analisador de planilhas Excel (.xlsx)
│   ├── types.ts               # Tipos TypeScript do domínio de queima
│   ├── App.tsx                # Componente principal do dashboard
│   └── main.tsx               # Ponto de entrada React
├── server.ts                  # Backend Express com endpoints REST e segurança
├── index.html                 # HTML de entrada
└── package.json               # Configurações e scripts
```
