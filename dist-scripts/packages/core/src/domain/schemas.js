"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountUpdateSchema = exports.accountInputSchema = void 0;
const zod_1 = require("zod");
exports.accountInputSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Nome é obrigatório'),
    server: zod_1.z.string().trim().url('Server deve ser uma URL válida, ex: https://servidor.com:443'),
    username: zod_1.z.string().trim().min(1, 'Username é obrigatório'),
    password: zod_1.z.string().min(1, 'Password é obrigatório'),
    output: zod_1.z.enum(['m3u8', 'ts']),
    player: zod_1.z.enum(['vlc', 'mpv', 'browser', 'internal']),
    userAgent: zod_1.z.string().trim().optional()
});
exports.accountUpdateSchema = exports.accountInputSchema.partial();
