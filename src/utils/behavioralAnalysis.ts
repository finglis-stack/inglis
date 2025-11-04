export interface MouseMovement {
  x: number;
  y: number;
  timestamp: number;
}

export interface ScrollEvent {
  scrollY: number;
  timestamp: number;
}

export interface BehavioralSignals {
  mouseMovements: MouseMovement[];
  scrollEvents: ScrollEvent[];
  clickEvents: number;
  keypressEvents: number;
  focusChanges: number;
  totalTimeOnPage: number;
  idleTime: number;
  mouseVelocity: number;
  mouseAcceleration: number;
  scrollVelocity: number;
  isLikelyBot: boolean;
  suspiciousPatterns: string[];
}

class BehavioralAnalyzer {
  private mouseMovements: MouseMovement[] = [];
  private scrollEvents: ScrollEvent[] = [];
  private clickEvents = 0;
  private keypressEvents = 0;
  private focusChanges = 0;
  private pageLoadTime = Date.now();
  private lastActivityTime = Date.now();
  private idleTime = 0;
  private listeners: (() => void)[] = [];

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    const handleMouseMove = (e: MouseEvent) => {
      this.mouseMovements.push({
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
      });
      this.lastActivityTime = Date.now();
      
      // Keep only last 100 movements to avoid memory issues
      if (this.mouseMovements.length > 100) {
        this.mouseMovements.shift();
      }
    };

    const handleScroll = () => {
      this.scrollEvents.push({
        scrollY: window.scrollY,
        timestamp: Date.now(),
      });
      this.lastActivityTime = Date.now();
      
      if (this.scrollEvents.length > 50) {
        this.scrollEvents.shift();
      }
    };

    const handleClick = () => {
      this.clickEvents++;
      this.lastActivityTime = Date.now();
    };

    const handleKeypress = () => {
      this.keypressEvents++;
      this.lastActivityTime = Date.now();
    };

    const handleFocus = () => {
      this.focusChanges++;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('click', handleClick);
    window.addEventListener('keypress', handleKeypress);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleFocus);

    this.listeners.push(
      () => window.removeEventListener('mousemove', handleMouseMove),
      () => window.removeEventListener('scroll', handleScroll),
      () => window.removeEventListener('click', handleClick),
      () => window.removeEventListener('keypress', handleKeypress),
      () => window.removeEventListener('focus', handleFocus),
      () => window.removeEventListener('blur', handleFocus)
    );

    // Track idle time
    setInterval(() => {
      const now = Date.now();
      if (now - this.lastActivityTime > 5000) {
        this.idleTime += 1000;
      }
    }, 1000);
  }

  private calculateMouseVelocity(): number {
    if (this.mouseMovements.length < 2) return 0;
    
    let totalVelocity = 0;
    for (let i = 1; i < this.mouseMovements.length; i++) {
      const prev = this.mouseMovements[i - 1];
      const curr = this.mouseMovements[i];
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
      if (timeDiff > 0) {
        totalVelocity += distance / timeDiff;
      }
    }
    return totalVelocity / (this.mouseMovements.length - 1);
  }

  private calculateMouseAcceleration(): number {
    if (this.mouseMovements.length < 3) return 0;
    
    const velocities: number[] = [];
    for (let i = 1; i < this.mouseMovements.length; i++) {
      const prev = this.mouseMovements[i - 1];
      const curr = this.mouseMovements[i];
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000;
      if (timeDiff > 0) {
        velocities.push(distance / timeDiff);
      }
    }
    
    let totalAcceleration = 0;
    for (let i = 1; i < velocities.length; i++) {
      totalAcceleration += Math.abs(velocities[i] - velocities[i - 1]);
    }
    return velocities.length > 1 ? totalAcceleration / (velocities.length - 1) : 0;
  }

  private calculateScrollVelocity(): number {
    if (this.scrollEvents.length < 2) return 0;
    
    let totalVelocity = 0;
    for (let i = 1; i < this.scrollEvents.length; i++) {
      const prev = this.scrollEvents[i - 1];
      const curr = this.scrollEvents[i];
      const distance = Math.abs(curr.scrollY - prev.scrollY);
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000;
      if (timeDiff > 0) {
        totalVelocity += distance / timeDiff;
      }
    }
    return totalVelocity / (this.scrollEvents.length - 1);
  }

  private detectBotBehavior(): { isBot: boolean; patterns: string[] } {
    const patterns: string[] = [];
    let isBot = false;

    // Pattern 1: Mouvements de souris trop linéaires (bots ont des mouvements parfaits)
    if (this.mouseMovements.length > 10) {
      let linearCount = 0;
      for (let i = 2; i < this.mouseMovements.length; i++) {
        const p1 = this.mouseMovements[i - 2];
        const p2 = this.mouseMovements[i - 1];
        const p3 = this.mouseMovements[i];
        
        const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
        const angleDiff = Math.abs(angle1 - angle2);
        
        if (angleDiff < 0.1) linearCount++;
      }
      
      if (linearCount / this.mouseMovements.length > 0.8) {
        patterns.push('Mouvements de souris trop linéaires');
        isBot = true;
      }
    }

    // Pattern 2: Aucun mouvement de souris
    if (this.mouseMovements.length === 0 && Date.now() - this.pageLoadTime > 5000) {
      patterns.push('Aucun mouvement de souris détecté');
      isBot = true;
    }

    // Pattern 3: Vitesse de souris constante (humains varient)
    const velocity = this.calculateMouseVelocity();
    const acceleration = this.calculateMouseAcceleration();
    if (velocity > 0 && acceleration < 10) {
      patterns.push('Vitesse de souris trop constante');
      isBot = true;
    }

    // Pattern 4: Pas de scroll mais page longue
    if (this.scrollEvents.length === 0 && document.body.scrollHeight > window.innerHeight * 1.5 && Date.now() - this.pageLoadTime > 5000) {
      patterns.push('Aucun scroll sur une page longue');
    }

    // Pattern 5: Temps sur la page trop court
    const timeOnPage = Date.now() - this.pageLoadTime;
    if (timeOnPage < 2000 && this.clickEvents > 0) {
      patterns.push('Interaction trop rapide');
      isBot = true;
    }

    // Pattern 6: Ratio idle/active anormal
    const activeTime = timeOnPage - this.idleTime;
    if (activeTime > 0 && this.idleTime / activeTime > 10) {
      patterns.push('Temps d\'inactivité anormal');
    }

    return { isBot, patterns };
  }

  public getSignals(): BehavioralSignals {
    const botDetection = this.detectBotBehavior();
    
    return {
      mouseMovements: this.mouseMovements,
      scrollEvents: this.scrollEvents,
      clickEvents: this.clickEvents,
      keypressEvents: this.keypressEvents,
      focusChanges: this.focusChanges,
      totalTimeOnPage: Date.now() - this.pageLoadTime,
      idleTime: this.idleTime,
      mouseVelocity: this.calculateMouseVelocity(),
      mouseAcceleration: this.calculateMouseAcceleration(),
      scrollVelocity: this.calculateScrollVelocity(),
      isLikelyBot: botDetection.isBot,
      suspiciousPatterns: botDetection.patterns,
    };
  }

  public cleanup() {
    this.listeners.forEach(removeListener => removeListener());
  }
}

export const behavioralAnalyzer = new BehavioralAnalyzer();