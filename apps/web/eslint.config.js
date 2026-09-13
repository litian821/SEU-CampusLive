import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/essential'],
  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: ts.parser, extraFileExtensions: ['.vue'] } } },
  { files: ['src/**/*.{ts,vue}', 'tests/**/*.ts'], languageOptions: { globals: Object.fromEntries(['document','window','fetch','AbortController','AbortSignal','HTMLMediaElement','HTMLVideoElement','HTMLDialogElement','HTMLImageElement','HTMLElement','Event','KeyboardEvent','setTimeout','clearTimeout','setInterval','clearInterval','URL','console'].map(name => [name, 'readonly'])) } },
]
