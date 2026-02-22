/**
 * Canvas 히스토리 관리 (Undo/Redo)
 */

'use client';

import { fabric } from 'fabric';

export class CanvasHistory {
  private canvas: fabric.Canvas;
  private history: string[] = [];
  private currentStep: number = -1;
  private isUndoing: boolean = false;
  private isEditing: boolean = false;
  private isProgrammaticUpdate: boolean = false; // NEW: Skip history during setup
  private maxHistory: number = 50;
  private backgroundImageUrl: string | null = null;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
    this.initializeHistory();
    this.setupEventListeners();
  }

  /**
   * 배경 이미지 URL 설정
   */
  public setBackgroundImageUrl(url: string) {
    this.backgroundImageUrl = url;
  }

  /**
   * Programmatic update mode 시작 (히스토리 저장 일시 중지)
   */
  public startProgrammaticUpdate() {
    this.isProgrammaticUpdate = true;
    console.log('[History] Programmatic update mode ON - history paused');
  }

  /**
   * Programmatic update mode 종료 (히스토리 저장 재개)
   */
  public endProgrammaticUpdate() {
    this.isProgrammaticUpdate = false;
    console.log('[History] Programmatic update mode OFF - history resumed');
  }

  /**
   * 초기 상태 저장
   */
  private initializeHistory() {
    this.saveState();
  }

  /**
   * 캔버스 이벤트 리스너 설정
   */
  private setupEventListeners() {
    // 텍스트 편집 시작/종료 감지
    this.canvas.on('text:editing:entered', () => {
      this.isEditing = true;
      console.log('[History] Text editing started - pausing history');
    });

    this.canvas.on('text:editing:exited', () => {
      this.isEditing = false;
      console.log('[History] Text editing ended - saving state');
      this.saveState();
    });

    // 객체가 수정될 때마다 상태 저장 (편집 중이 아닐 때만)
    this.canvas.on('object:modified', () => {
      if (!this.isEditing) {
        this.saveState();
      }
    });

    this.canvas.on('object:added', () => {
      if (!this.isUndoing && !this.isEditing) {
        this.saveState();
      }
    });

    this.canvas.on('object:removed', () => {
      if (!this.isUndoing && !this.isEditing) {
        this.saveState();
      }
    });
  }

  /**
   * 현재 캔버스 상태 저장
   */
  private saveState() {
    if (this.isUndoing || this.isProgrammaticUpdate) return;

    // 현재 스텝 이후의 히스토리 제거 (새로운 변경이 생겼으므로)
    this.history = this.history.slice(0, this.currentStep + 1);

    // 현재 상태를 JSON으로 저장
    const state = JSON.stringify(this.canvas.toJSON(['regionId', 'layerName', 'layerIndex', 'pdfRegionId']));
    this.history.push(state);
    this.currentStep++;

    // 최대 히스토리 개수 유지
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentStep--;
    }

    console.log(`[History] State saved. Step: ${this.currentStep}, Total: ${this.history.length}`);
  }

  /**
   * Undo (되돌리기)
   */
  public undo() {
    if (this.currentStep > 0) {
      this.isUndoing = true;
      this.currentStep--;
      this.loadState(this.history[this.currentStep]);
      console.log(`[History] Undo to step ${this.currentStep}`);
      this.isUndoing = false;
    } else {
      console.log('[History] No more undo steps');
    }
  }

  /**
   * Redo (다시 실행)
   */
  public redo() {
    if (this.currentStep < this.history.length - 1) {
      this.isUndoing = true;
      this.currentStep++;
      this.loadState(this.history[this.currentStep]);
      console.log(`[History] Redo to step ${this.currentStep}`);
      this.isUndoing = false;
    } else {
      console.log('[History] No more redo steps');
    }
  }

  /**
   * 저장된 상태로 캔버스 복원
   */
  private loadState(state: string) {
    this.canvas.loadFromJSON(state, () => {
      // No layer reordering needed - background is baked, only text objects exist
      this.canvas.renderAll();
      console.log('[History] State restored');
    });
  }

  /**
   * 키보드 이벤트 핸들러 설정
   */
  public setupKeyboardShortcuts() {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z (Windows/Linux) 또는 Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      // Ctrl+Shift+Z 또는 Ctrl+Y (Redo)
      else if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        this.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // 클린업 함수 반환
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * 히스토리 초기화
   */
  public clear() {
    this.history = [];
    this.currentStep = -1;
    this.saveState();
  }
}
