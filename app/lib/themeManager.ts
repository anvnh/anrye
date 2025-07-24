import { 
  vscDarkPlus, 
  oneDark, 
  atomDark, 
  tomorrow, 
  prism,
  okaidia,
  materialDark,
  coldarkDark,
} from 'react-syntax-highlighter/dist/cjs/styles/prism';

export interface Theme {
  id: string;
  name: string;
  style: any;
  category: 'dark' | 'light';
}

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: string = 'vscDarkPlus';
  private storageKey: string = 'syntax-theme';

  private themes: Theme[] = [
    {
      id: 'vscDarkPlus',
      name: 'VS Code Dark+',
      style: vscDarkPlus,
      category: 'dark'
    },
    {
      id: 'oneDark',
      name: 'One Dark',
      style: oneDark,
      category: 'dark'
    },
    {
      id: 'atomDark',
      name: 'Atom Dark',
      style: atomDark,
      category: 'dark'
    },
    {
      id: 'materialDark',
      name: 'Material Dark',
      style: materialDark,
      category: 'dark'
    },
    {
      id: 'coldarkDark',
      name: 'Coldark Dark',
      style: coldarkDark,
      category: 'dark'
    },
    {
      id: 'okaidia',
      name: 'Okaidia',
      style: okaidia,
      category: 'dark'
    },
    {
      id: 'tomorrow',
      name: 'Tomorrow',
      style: tomorrow,
      category: 'light'
    },
    {
      id: 'prism',
      name: 'Prism',
      style: prism,
      category: 'light'
    }
  ];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  public getCurrentTheme(): Theme {
    return this.getThemeById(this.currentTheme) || this.themes[0];
  }

  public getCurrentThemeId(): string {
    return this.currentTheme;
  }

  public setTheme(themeId: string): boolean {
    const theme = this.getThemeById(themeId);
    if (theme) {
      this.currentTheme = themeId;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public getThemeById(themeId: string): Theme | undefined {
    return this.themes.find(theme => theme.id === themeId);
  }

  public getAllThemes(): Theme[] {
    return [...this.themes];
  }

  public getThemesByCategory(category: 'dark' | 'light'): Theme[] {
    return this.themes.filter(theme => theme.category === category);
  }

  public getDarkThemes(): Theme[] {
    return this.getThemesByCategory('dark');
  }

  public getLightThemes(): Theme[] {
    return this.getThemesByCategory('light');
  }

  public getNextTheme(): Theme {
    const currentIndex = this.themes.findIndex(theme => theme.id === this.currentTheme);
    const nextIndex = (currentIndex + 1) % this.themes.length;
    return this.themes[nextIndex];
  }

  public getPreviousTheme(): Theme {
    const currentIndex = this.themes.findIndex(theme => theme.id === this.currentTheme);
    const prevIndex = currentIndex === 0 ? this.themes.length - 1 : currentIndex - 1;
    return this.themes[prevIndex];
  }

  public cycleToNextTheme(): Theme {
    const nextTheme = this.getNextTheme();
    this.setTheme(nextTheme.id);
    return nextTheme;
  }

  public cycleToPreviousTheme(): Theme {
    const prevTheme = this.getPreviousTheme();
    this.setTheme(prevTheme.id);
    return prevTheme;
  }

  public isValidTheme(themeId: string): boolean {
    return this.themes.some(theme => theme.id === themeId);
  }

  public getRandomTheme(): Theme {
    const randomIndex = Math.floor(Math.random() * this.themes.length);
    return this.themes[randomIndex];
  }

  public setRandomTheme(): Theme {
    const randomTheme = this.getRandomTheme();
    this.setTheme(randomTheme.id);
    return randomTheme;
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && this.isValidTheme(saved)) {
        this.currentTheme = saved;
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, this.currentTheme);
    }
  }

  public exportThemes(): string {
    return JSON.stringify({
      currentTheme: this.currentTheme,
      availableThemes: this.themes.map(theme => ({
        id: theme.id,
        name: theme.name,
        category: theme.category
      }))
    }, null, 2);
  }

  public getThemeStats(): { total: number; dark: number; light: number } {
    const dark = this.getDarkThemes().length;
    const light = this.getLightThemes().length;
    return {
      total: this.themes.length,
      dark,
      light
    };
  }
}

export default ThemeManager;
