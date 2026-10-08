// src/main.ts — OWNER: A1. Entry point.
import './app/app.css';
import './ui/styles.css';
import './ui/styles-compact.css'; // after styles.css: phone sizing wins ties with the desktop rules
import { createApp } from './app/app';
import { startLoop } from './app/loop';

const canvas = document.getElementById('game');
const ui = document.getElementById('ui');
if (!(canvas instanceof HTMLCanvasElement) || !ui) throw new Error('index.html is missing #game or #ui');
startLoop(createApp(canvas, ui));
