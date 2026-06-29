// @ts-nocheck
export type Theme = {
  accentBackground: string;
  accentColor: string;
  background0: string;
  background02: string;
  background04: string;
  background06: string;
  background08: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  color7: string;
  color8: string;
  color9: string;
  color10: string;
  color11: string;
  color12: string;
  color0: string;
  color02: string;
  color04: string;
  color06: string;
  color08: string;
  background: string;
  backgroundHover: string;
  backgroundPress: string;
  backgroundFocus: string;
  borderColor: string;
  borderColorHover: string;
  borderColorPress: string;
  borderColorFocus: string;
  color: string;
  colorHover: string;
  colorPress: string;
  colorFocus: string;
  placeholderColor: string;
  outlineColor: string;
  colorTransparent: string;
  sand1: string;
  sand2: string;
  sand3: string;
  sand4: string;
  sand5: string;
  sand6: string;
  sand7: string;
  sand8: string;
  sand9: string;
  sand10: string;
  sand11: string;
  sand12: string;
  shadow1: string;
  shadow2: string;
  shadow3: string;
  shadow4: string;
  shadow5: string;
  shadow6: string;
  black1: string;
  black2: string;
  black3: string;
  black4: string;
  black5: string;
  black6: string;
  black7: string;
  black8: string;
  black9: string;
  black10: string;
  black11: string;
  black12: string;
  white1: string;
  white2: string;
  white3: string;
  white4: string;
  white5: string;
  white6: string;
  white7: string;
  white8: string;
  white9: string;
  white10: string;
  white11: string;
  white12: string;
  shadowColor: string;
  white: string;
  white0: string;
  white02: string;
  white04: string;
  white06: string;
  white08: string;
  black: string;
  black0: string;
  black02: string;
  black04: string;
  black06: string;
  black08: string;
  highlight: string;
  highlight0: string;
  highlight02: string;
  highlight04: string;
  highlight06: string;
  highlight08: string;
  color1pt5: string;
  color2pt5: string;
  surface: string;
  surface0: string;
  surface02: string;
  surface04: string;
  surface06: string;
  surface08: string;
  surface085: string;
  surface09: string;
  surface095: string;
  color01: string;
  color0075: string;
  color005: string;
  color0025: string;
  background01: string;
  background0075: string;
  background005: string;
  background0025: string;
  accent1: string;
  accent2: string;
  accent3: string;
  accent4: string;
  accent5: string;
  accent6: string;
  accent7: string;
  accent8: string;
  accent9: string;
  accent10: string;
  accent11: string;
  accent12: string;

}

function t(a: [number, number][]) {
  let res: Record<string,string> = {}
  for (const [ki, vi] of a) {
    res[ks[ki] as string] = colors[vi] as string
  }
  return res as Theme
}
export const colors = [
  'hsla(0, 0%, 16%, 1)',
  'hsla(0, 0%, 60%, 1)',
  'hsla(0, 0%, 100%, 0)',
  'hsla(0, 0%, 100%, 0.2)',
  'hsla(0, 0%, 100%, 0.4)',
  'hsla(0, 0%, 100%, 0.6)',
  'hsla(0, 0%, 100%, 0.8)',
  'hsla(0, 0%, 100%, 1)',
  'hsla(0, 0%, 97%, 1)',
  'hsla(0, 0%, 93%, 1)',
  'hsla(0, 0%, 87%, 1)',
  'hsla(0, 0%, 80%, 1)',
  'hsla(0, 0%, 74%, 1)',
  'hsla(0, 0%, 68%, 1)',
  'hsla(0, 0%, 48%, 1)',
  'hsla(0, 0%, 38%, 1)',
  'hsla(0, 0%, 20%, 1)',
  'hsla(0, 0%, 2%, 1)',
  'hsla(0, 0%, 2%, 0)',
  'hsla(0, 0%, 2%, 0.2)',
  'hsla(0, 0%, 2%, 0.4)',
  'hsla(0, 0%, 2%, 0.6)',
  'hsla(0, 0%, 2%, 0.8)',
  '#fdfdfc',
  '#f9f9f8',
  '#f1f0ef',
  '#e9e8e6',
  '#e2e1de',
  '#dad9d6',
  '#cfceca',
  '#bcbbb5',
  '#8d8d86',
  '#82827c',
  '#63635e',
  '#21201c',
  'rgba(0,0,0,0.025)',
  'rgba(0,0,0,0.04)',
  'rgba(0,0,0,0.06)',
  'rgba(0,0,0,0.095)',
  'rgba(0,0,0,0.195)',
  'rgba(0,0,0,0.3)',
  '#080808',
  '#191919',
  '#282828',
  '#353535',
  '#444',
  '#484848',
  '#525252',
  '#686868',
  '#757575',
  '#9a9a9a',
  '#ccc',
  '#fefefe',
  '#fff',
  '#f8f8f8',
  'hsl(0, 0%, 93%)',
  'hsl(0, 0%, 87%)',
  'hsl(0, 0%, 80%)',
  'hsl(0, 0%, 74%)',
  'hsl(0, 0%, 68%)',
  'hsl(0, 0%, 60%)',
  'hsl(0, 0%, 48%)',
  'hsl(0, 0%, 38%)',
  'hsl(0, 0%, 20%)',
  'hsl(0, 0%, 2%)',
  'rgba(255,255,255,1)',
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.2)',
  'rgba(255,255,255,0.4)',
  'rgba(255,255,255,0.6)',
  'rgba(255,255,255,0.8)',
  'rgba(0,0,0,1)',
  'rgba(0,0,0,0)',
  'rgba(0,0,0,0.2)',
  'rgba(0,0,0,0.4)',
  'rgba(0,0,0,0.6)',
  'rgba(0,0,0,0.8)',
  '#f9f9f9',
  '#f4f4f4',
  '#f5f5f7',
  'rgba(245, 245, 247, 0)',
  'rgba(245, 245, 247, 0.2)',
  'rgba(245, 245, 247, 0.4)',
  'rgba(245, 245, 247, 0.6)',
  'rgba(245, 245, 247, 0.8)',
  'rgba(245, 245, 247, 0.85)',
  'rgba(245, 245, 247, 0.9)',
  'rgba(245, 245, 247, 0.95)',
  'hsla(0, 0%, 2%, 0.1)',
  'hsla(0, 0%, 2%, 0.075)',
  'hsla(0, 0%, 2%, 0.05)',
  'hsla(0, 0%, 2%, 0.025)',
  '#ffffff1a',
  '#ffffff13',
  '#ffffff0d',
  '#ffffff06',
  'hsla(0, 0%, 3%, 1)',
  'hsla(0, 0%, 10%, 1)',
  'hsla(0, 0%, 21%, 1)',
  'hsla(0, 0%, 27%, 1)',
  'hsla(0, 0%, 28%, 1)',
  'hsla(0, 0%, 32%, 1)',
  'hsla(0, 0%, 41%, 1)',
  'hsla(0, 0%, 46%, 1)',
  'hsla(0, 0%, 3%, 0)',
  'hsla(0, 0%, 3%, 0.2)',
  'hsla(0, 0%, 3%, 0.4)',
  'hsla(0, 0%, 3%, 0.6)',
  'hsla(0, 0%, 3%, 0.8)',
  '#111110',
  '#191918',
  '#222221',
  '#2a2a28',
  '#31312e',
  '#3b3a37',
  '#494844',
  '#62605b',
  '#6f6d66',
  '#7c7b74',
  '#b5b3ad',
  '#eeeeec',
  'rgba(0,0,0,0.1)',
  'rgba(0,0,0,0.18)',
  'rgba(0,0,0,0.25)',
  'rgba(0,0,0,0.55)',
  'rgba(0,0,0,0.66)',
  'rgba(28,28,28, 1)',
  'rgba(28,28,28, 0)',
  'rgba(28,28,28, 0.2)',
  'rgba(28,28,28, 0.4)',
  'rgba(28,28,28, 0.6)',
  'rgba(28,28,28, 0.8)',
  'rgba(20,20,20)',
  '#222',
  '#1E1E1E',
  'rgba(30, 30, 30, 0)',
  'rgba(30, 30, 30, 0.2)',
  'rgba(30, 30, 30, 0.4)',
  'rgba(30, 30, 30, 0.6)',
  'rgba(30, 30, 30, 0.8)',
  'rgba(30, 30, 30, 0.85)',
  'rgba(30, 30, 30, 0.9)',
  'rgba(30, 30, 30, 0.95)',
  '#fefefe1a',
  '#fefefe13',
  '#fefefe0d',
  '#fefefe06',
  '#0808081a',
  '#08080813',
  '#0808080d',
  '#08080806',
  'hsla(60, 20%, 99%, 0)',
  'hsla(60, 20%, 99%, 0.2)',
  'hsla(60, 20%, 99%, 0.4)',
  'hsla(60, 20%, 99%, 0.6)',
  'hsla(60, 20%, 99%, 0.8)',
  'hsla(60, 20%, 99%, 1)',
  'hsla(60, 8%, 97%, 1)',
  'hsla(30, 7%, 94%, 1)',
  'hsla(40, 6%, 91%, 1)',
  'hsla(45, 6%, 88%, 1)',
  'hsla(45, 5%, 85%, 1)',
  'hsla(48, 5%, 80%, 1)',
  'hsla(51, 5%, 72%, 1)',
  'hsla(60, 3%, 54%, 1)',
  'hsla(60, 2%, 50%, 1)',
  'hsla(60, 3%, 38%, 1)',
  'hsla(48, 8%, 12%, 1)',
  'hsla(48, 8%, 12%, 0)',
  'hsla(48, 8%, 12%, 0.2)',
  'hsla(48, 8%, 12%, 0.4)',
  'hsla(48, 8%, 12%, 0.6)',
  'hsla(48, 8%, 12%, 0.8)',
  'hsla(60, 3%, 6%, 0)',
  'hsla(60, 3%, 6%, 0.2)',
  'hsla(60, 3%, 6%, 0.4)',
  'hsla(60, 3%, 6%, 0.6)',
  'hsla(60, 3%, 6%, 0.8)',
  'hsla(60, 3%, 6%, 1)',
  'hsla(60, 2%, 10%, 1)',
  'hsla(60, 1%, 13%, 1)',
  'hsla(60, 2%, 16%, 1)',
  'hsla(60, 3%, 19%, 1)',
  'hsla(45, 4%, 22%, 1)',
  'hsla(48, 4%, 28%, 1)',
  'hsla(43, 4%, 37%, 1)',
  'hsla(47, 4%, 42%, 1)',
  'hsla(53, 3%, 47%, 1)',
  'hsla(45, 5%, 69%, 1)',
  'hsla(60, 6%, 93%, 1)',
  'hsla(60, 6%, 93%, 0)',
  'hsla(60, 6%, 93%, 0.2)',
  'hsla(60, 6%, 93%, 0.4)',
  'hsla(60, 6%, 93%, 0.6)',
  'hsla(60, 6%, 93%, 0.8)',
]

const ks = [
'accentBackground',
'accentColor',
'background0',
'background02',
'background04',
'background06',
'background08',
'color1',
'color2',
'color3',
'color4',
'color5',
'color6',
'color7',
'color8',
'color9',
'color10',
'color11',
'color12',
'color0',
'color02',
'color04',
'color06',
'color08',
'background',
'backgroundHover',
'backgroundPress',
'backgroundFocus',
'borderColor',
'borderColorHover',
'borderColorPress',
'borderColorFocus',
'color',
'colorHover',
'colorPress',
'colorFocus',
'placeholderColor',
'outlineColor',
'colorTransparent',
'sand1',
'sand2',
'sand3',
'sand4',
'sand5',
'sand6',
'sand7',
'sand8',
'sand9',
'sand10',
'sand11',
'sand12',
'shadow1',
'shadow2',
'shadow3',
'shadow4',
'shadow5',
'shadow6',
'black1',
'black2',
'black3',
'black4',
'black5',
'black6',
'black7',
'black8',
'black9',
'black10',
'black11',
'black12',
'white1',
'white2',
'white3',
'white4',
'white5',
'white6',
'white7',
'white8',
'white9',
'white10',
'white11',
'white12',
'shadowColor',
'white',
'white0',
'white02',
'white04',
'white06',
'white08',
'black',
'black0',
'black02',
'black04',
'black06',
'black08',
'highlight',
'highlight0',
'highlight02',
'highlight04',
'highlight06',
'highlight08',
'color1pt5',
'color2pt5',
'surface',
'surface0',
'surface02',
'surface04',
'surface06',
'surface08',
'surface085',
'surface09',
'surface095',
'color01',
'color0075',
'color005',
'color0025',
'background01',
'background0075',
'background005',
'background0025',
'accent1',
'accent2',
'accent3',
'accent4',
'accent5',
'accent6',
'accent7',
'accent8',
'accent9',
'accent10',
'accent11',
'accent12']


const n1 = t([[0, 0],[1, 1],[2, 2],[3, 3],[4, 4],[5, 5],[6, 6],[7, 7],[8, 8],[9, 9],[10, 10],[11, 11],[12, 12],[13, 13],[14, 1],[15, 14],[16, 15],[17, 16],[18, 17],[19, 18],[20, 19],[21, 20],[22, 21],[23, 22],[24, 7],[25, 9],[26, 10],[27, 9],[28, 10],[29, 9],[30, 11],[31, 10],[32, 17],[33, 16],[34, 17],[35, 16],[36, 14],[37, 19],[38, 18],[39, 23],[40, 24],[41, 25],[42, 26],[43, 27],[44, 28],[45, 29],[46, 30],[47, 31],[48, 32],[49, 33],[50, 34],[51, 35],[52, 36],[53, 37],[54, 38],[55, 39],[56, 40],[57, 41],[58, 42],[59, 43],[60, 44],[61, 45],[62, 46],[63, 47],[64, 48],[65, 49],[66, 50],[67, 51],[68, 52],[69, 53],[70, 54],[71, 55],[72, 56],[73, 57],[74, 58],[75, 59],[76, 60],[77, 61],[78, 62],[79, 63],[80, 64],[81, 35],[82, 65],[83, 66],[84, 67],[85, 68],[86, 69],[87, 70],[88, 71],[89, 72],[90, 73],[91, 74],[92, 75],[93, 76],[94, 65],[95, 66],[96, 67],[97, 68],[98, 69],[99, 70],[100, 77],[101, 78],[102, 79],[103, 80],[104, 81],[105, 82],[106, 83],[107, 84],[108, 85],[109, 86],[110, 87],[111, 88],[112, 89],[113, 90],[114, 91],[115, 92],[116, 93],[117, 94],[118, 95],[119, 96],[120, 97],[121, 0],[122, 98],[123, 99],[124, 100],[125, 101],[126, 102],[127, 103],[128, 1],[129, 11],[130, 7]])
const n2 = t([[0, 15],[1, 9],[2, 104],[3, 105],[4, 106],[5, 107],[6, 108],[7, 96],[8, 97],[9, 0],[10, 98],[11, 99],[12, 100],[13, 101],[14, 102],[15, 103],[16, 1],[17, 11],[18, 7],[19, 2],[20, 3],[21, 4],[22, 5],[23, 6],[24, 96],[25, 0],[26, 98],[27, 0],[28, 98],[29, 99],[30, 0],[31, 98],[32, 7],[33, 11],[34, 7],[35, 11],[36, 103],[37, 3],[38, 2],[39, 109],[40, 110],[41, 111],[42, 112],[43, 113],[44, 114],[45, 115],[46, 116],[47, 117],[48, 118],[49, 119],[50, 120],[51, 121],[52, 122],[53, 123],[54, 74],[55, 124],[56, 125],[57, 41],[58, 42],[59, 43],[60, 44],[61, 45],[62, 46],[63, 47],[64, 48],[65, 49],[66, 50],[67, 51],[68, 52],[69, 53],[70, 54],[71, 55],[72, 56],[73, 57],[74, 58],[75, 59],[76, 60],[77, 61],[78, 62],[79, 63],[80, 64],[81, 121],[82, 65],[83, 66],[84, 67],[85, 68],[86, 69],[87, 70],[88, 71],[89, 72],[90, 73],[91, 74],[92, 75],[93, 76],[94, 126],[95, 127],[96, 128],[97, 129],[98, 130],[99, 131],[100, 132],[101, 133],[102, 134],[103, 135],[104, 136],[105, 137],[106, 138],[107, 139],[108, 140],[109, 141],[110, 142],[111, 143],[112, 144],[113, 145],[114, 146],[115, 147],[116, 148],[117, 149],[118, 150],[119, 7],[120, 8],[121, 9],[122, 10],[123, 11],[124, 12],[125, 13],[126, 1],[127, 14],[128, 15],[129, 16],[130, 17]])
const n3 = t([[0, 9],[1, 15],[2, 104],[3, 105],[4, 106],[5, 107],[6, 108],[7, 96],[8, 97],[9, 0],[10, 98],[11, 99],[12, 100],[13, 101],[14, 102],[15, 103],[16, 1],[17, 11],[18, 7],[19, 2],[20, 3],[21, 4],[22, 5],[23, 6],[24, 96],[25, 0],[26, 98],[27, 0],[28, 98],[29, 0],[30, 99],[31, 98],[32, 7],[33, 11],[34, 7],[35, 11],[36, 103],[37, 3],[38, 2]])
const n4 = t([[0, 1],[1, 0],[2, 2],[3, 3],[4, 4],[5, 5],[6, 6],[7, 7],[8, 8],[9, 9],[10, 10],[11, 11],[12, 12],[13, 13],[14, 1],[15, 14],[16, 15],[17, 16],[18, 17],[19, 18],[20, 19],[21, 20],[22, 21],[23, 22],[24, 7],[25, 9],[26, 10],[27, 9],[28, 10],[29, 11],[30, 9],[31, 10],[32, 17],[33, 16],[34, 17],[35, 16],[36, 14],[37, 19],[38, 18]])
const n5 = t([[0, 0],[1, 1],[2, 104],[3, 105],[4, 106],[5, 107],[6, 108],[7, 96],[8, 97],[9, 0],[10, 98],[11, 99],[12, 100],[13, 101],[14, 102],[15, 103],[16, 1],[17, 11],[18, 7],[19, 2],[20, 3],[21, 4],[22, 5],[23, 6],[24, 96],[25, 0],[26, 98],[27, 0],[28, 98],[29, 0],[30, 99],[31, 98],[32, 7],[33, 11],[34, 7],[35, 11],[36, 103],[37, 3],[38, 2]])
const n6 = t([[0, 0],[1, 1],[2, 2],[3, 3],[4, 4],[5, 5],[6, 6],[7, 7],[8, 8],[9, 9],[10, 10],[11, 11],[12, 12],[13, 13],[14, 1],[15, 14],[16, 15],[17, 16],[18, 17],[19, 18],[20, 19],[21, 20],[22, 21],[23, 22],[24, 7],[25, 9],[26, 10],[27, 9],[28, 10],[29, 9],[30, 11],[31, 10],[32, 17],[33, 16],[34, 17],[35, 16],[36, 14],[37, 19],[38, 18]])
const n7 = t([[0, 0],[1, 1],[2, 151],[3, 152],[4, 153],[5, 154],[6, 155],[7, 156],[8, 157],[9, 158],[10, 159],[11, 160],[12, 161],[13, 162],[14, 163],[15, 164],[16, 165],[17, 166],[18, 167],[19, 168],[20, 169],[21, 170],[22, 171],[23, 172],[24, 156],[25, 158],[26, 159],[27, 158],[28, 159],[29, 158],[30, 160],[31, 159],[32, 167],[33, 166],[34, 167],[35, 166],[36, 164],[37, 169],[38, 168]])
const n8 = t([[0, 15],[1, 9],[2, 104],[3, 105],[4, 106],[5, 107],[6, 108],[7, 96],[8, 97],[9, 0],[10, 98],[11, 99],[12, 100],[13, 101],[14, 102],[15, 103],[16, 1],[17, 11],[18, 7],[19, 2],[20, 3],[21, 4],[22, 5],[23, 6],[24, 96],[25, 0],[26, 98],[27, 0],[28, 98],[29, 99],[30, 0],[31, 98],[32, 7],[33, 11],[34, 7],[35, 11],[36, 103],[37, 3],[38, 2]])
const n9 = t([[0, 15],[1, 9],[2, 2],[3, 3],[4, 4],[5, 5],[6, 6],[7, 7],[8, 8],[9, 9],[10, 10],[11, 11],[12, 12],[13, 13],[14, 1],[15, 14],[16, 15],[17, 16],[18, 17],[19, 18],[20, 19],[21, 20],[22, 21],[23, 22],[24, 7],[25, 9],[26, 10],[27, 9],[28, 10],[29, 11],[30, 9],[31, 10],[32, 17],[33, 16],[34, 17],[35, 16],[36, 14],[37, 19],[38, 18]])
const n10 = t([[0, 15],[1, 9],[2, 173],[3, 174],[4, 175],[5, 176],[6, 177],[7, 178],[8, 179],[9, 180],[10, 181],[11, 182],[12, 183],[13, 184],[14, 185],[15, 186],[16, 187],[17, 188],[18, 189],[19, 190],[20, 191],[21, 192],[22, 193],[23, 194],[24, 178],[25, 180],[26, 181],[27, 180],[28, 181],[29, 182],[30, 180],[31, 181],[32, 189],[33, 188],[34, 189],[35, 188],[36, 186],[37, 191],[38, 190]])

export type ThemeNames =
 | 'light'
 | 'dark'
 | 'light_accent'
 | 'dark_accent'
 | 'light_black'
 | 'light_white'
 | 'light_tan'
 | 'dark_black'
 | 'dark_white'
 | 'dark_tan'

export type Themes = Record<ThemeNames, Theme>

export const themes: Themes = {
  light: n1,
  dark: n2,
  light_accent: n3,
  dark_accent: n4,
  light_black: n5,
  light_white: n6,
  light_tan: n7,
  dark_black: n8,
  dark_white: n9,
  dark_tan: n10,
}
