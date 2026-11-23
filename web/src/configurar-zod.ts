import { z } from "zod";

// A CSP de produção não permite eval. Sem isto o Zod testa `Function("")` ao criar os
// esquemas e o navegador registra uma violação (o erro é capturado, mas vira ruído no
// relatório de CSP). Este módulo é importado antes de qualquer esquema, em main.tsx.
z.config({ jitless: true });
