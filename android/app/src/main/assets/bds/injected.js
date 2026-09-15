(function(){"use strict";function H(e){const t=Array.isArray(e.skills)?e.skills.map(s=>({name:String(s&&s.name?s.name:"skill"),content:String(s&&s.content?s.content:"")})).filter(s=>s.content.trim().length>0):[],n=Array.isArray(e.memories)?e.memories.map(s=>({key:U(s&&s.key),value:String(s&&s.value?s.value:""),importance:$(s&&s.importance)})).filter(s=>s.key&&s.value.trim().length>0):[],r=F(e.activeProject),a=(Array.isArray(e.systemPromptEntries)?e.systemPromptEntries:[]).map(s=>({id:String(s&&s.id?s.id:""),content:String(s&&s.content?s.content:""),enabled:s&&typeof s.enabled=="boolean"?s.enabled:!0,schedule:q(s&&s.schedule)})).filter(s=>s.id&&s.content.trim().length>0&&s.enabled),u=Array.isArray(e.mcpToolSchemas)?e.mcpToolSchemas.map(s=>({serverName:String(s.serverName||""),serverUrl:String(s.serverUrl||""),toolName:String(s.toolName||""),description:String(s.description||""),inputSchema:s.inputSchema||{}})).filter(s=>s.serverName&&s.toolName):[];return{systemPrompt:String(e.systemPrompt||""),systemPromptEntries:a,skills:t,memories:n,activeCharacter:e.activeCharacter||null,preferredLang:String(e.preferredLang||""),disableSystemPrompt:!!e.disableSystemPrompt,disableMemory:!!e.disableMemory,systemPromptInjectionFrequency:String(e.systemPromptInjectionFrequency||"first"),systemPromptInjectionInterval:Number(e.systemPromptInjectionInterval)||3,activeProject:r,projectRagEnabled:!!e.projectRagEnabled,projectRagLimit:Number(e.projectRagLimit)||5,injectSystemDateTime:!!e.injectSystemDateTime,deepResearch:v(e.deepResearch),deepCode:X(e.deepCode),mcpToolSchemas:u,mcpInlineMaxChars:Number(e.mcpInlineMaxChars)||8e3,modelInputLimits:e.modelInputLimits||{}}}function X(e){return!e||typeof e!="object"?{enabled:!1,activeDirectory:null,manualPath:"",pendingReport:null,fileTree:""}:{enabled:!!e.enabled,activeDirectory:String(e.activeDirectory||"").trim(),manualPath:String(e.manualPath||"").trim(),fileTree:String(e.fileTree||"").trim(),pendingReport:e.pendingReport&&typeof e.pendingReport=="object"?{cwd:String(e.pendingReport.cwd||"").trim(),sessionId:String(e.pendingReport.sessionId||"").trim(),report:String(e.pendingReport.report||"").trim()}:null}}function v(e){return!e||typeof e!="object"?{enabled:!1,runId:""}:{enabled:!!e.enabled,runId:String(e.runId||"").trim()}}function F(e){if(!e||typeof e!="object")return null;const t=String(e.name||"").trim(),n=String(e.instructions||""),r=Array.isArray(e.files)?e.files.map(o=>({name:String(o&&o.name?o.name:"file"),content:String(o&&o.content?o.content:"")})).filter(o=>o.content.length>0):[];return t?{name:t,instructions:n,files:r}:null}function q(e){if(!e||typeof e!="object")return{type:"first",everyNTurns:1};const t=String(e.type||"first");return{type:["first","always","interval"].includes(t)?t:"first",everyNTurns:Math.max(1,Math.floor(Number(e.everyNTurns)||3))}}function U(e){return String(e||"").trim().toLowerCase().replace(/[^a-z0-9_]/g,"")}function $(e){return String(e||"called").toLowerCase()==="always"?"always":"called"}const J=`
## SheetJS (XLSX) Library Reference

### GLOBAL AVAILABILITY
- XLSX is ALREADY globally available as \`window.XLSX\` in the sandbox.
- Do NOT use \`import\`, \`require\`, or \`const XLSX = ...\`.
- Just call \`XLSX.utils.book_new()\`, \`XLSX.utils.json_to_sheet()\`, etc. directly.

### CORRECT API (most common operations)

1. CREATE WORKBOOK:
   const wb = XLSX.utils.book_new();

2. CREATE SHEET FROM DATA:
   // From array of objects (column headers auto-detected):
   const ws = XLSX.utils.json_to_sheet([
     { Name: "Alice", Age: 30 },
     { Name: "Bob", Age: 25 }
   ]);
   // From array of arrays (first row = headers):
   const ws2 = XLSX.utils.aoa_to_sheet([
     ["Name", "Age"],
     ["Alice", 30],
     ["Bob", 25]
   ]);

3. APPEND SHEET TO WORKBOOK:
   XLSX.utils.book_append_sheet(wb, ws, "SheetName");

4. COLUMN WIDTHS (optional but recommended):
   ws["!cols"] = [{ wch: 20 }, { wch: 10 }];

5. SAVE \u2014 ALWAYS end with:
   XLSX.writeFile(wb, "filename.xlsx");
   // CRITICAL: This triggers the download. Without it, nothing happens.

### COMPLETE MINIMAL EXAMPLE:
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet([
  { Product: "Widget", Price: 9.99, Stock: 42 },
  { Product: "Gadget", Price: 24.99, Stock: 17 }
]);
ws["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }];
XLSX.utils.book_append_sheet(wb, ws, "Products");
XLSX.writeFile(wb, "products.xlsx");

### COMMON MISTAKES TO AVOID:
- \u2717 \`const XLSX = require('xlsx')\` \u2014 NOT available, don't use require
- \u2717 \`const XLSX = ...\` \u2014 XLSX is already defined, redeclaring causes error
- \u2717 \`XLSX.write(wb, ...)\` without type \u2014 use \`XLSX.writeFile(wb, name)\` for download
- \u2717 \`for each row manually\` \u2014 use json_to_sheet or aoa_to_sheet
- \u2717 Forgetting \`XLSX.utils.book_append_sheet()\` \u2014 the sheet must be added to workbook
- \u2717 \`await XLSX.writeFile()\` \u2014 writeFile is synchronous, no await needed
- \u2717 Browser APIs like \`document.getElementById\`, \`fetch\`, \`Blob\` \u2014 NOT available in sandbox

### CELL STYLING (limited support):
// Cell object in sheet:
ws["A1"] = { t: "s", v: "Header", s: { font: { bold: true } } };
// But for simplicity, prefer json_to_sheet or aoa_to_sheet with post-processing.

### MULTIPLE SHEETS:
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data1), "Sheet1");
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data2), "Sheet2");
XLSX.writeFile(wb, "report.xlsx");

### FORMULAS:
const ws = XLSX.utils.aoa_to_sheet([
  ["Item", "Price", "Qty", "Total"],
  ["A", 10, 2, { t: "n", f: "B2*C2" }]
]);
`.trim(),G=`
## PptxGenJS Library Reference (PowerPoint)

### GLOBAL AVAILABILITY
- PptxGenJS is ALREADY globally available as \`window.PptxGenJS\` and \`window.pptxgen\` in the sandbox.
- Do NOT use \`import\`, \`require\`, or \`const PptxGenJS = ...\`.
- Just call \`new PptxGenJS()\` directly.

### CORRECT API

1. CREATE PRESENTATION:
   const pptx = new PptxGenJS();

2. CONFIGURE (optional):
   pptx.author = "Better DeepSeek";
   pptx.title = "Presentation Title";
   pptx.layout = "LAYOUT_WIDE"; // 16:9

3. ADD A SLIDE:
   const slide = pptx.addSlide();

4. ADD CONTENT TO SLIDE:
   // Text:
   slide.addText("Hello World", { x: 1, y: 1, w: 8, h: 1, fontSize: 24 });

   // Multi-line / bullet points:
   slide.addText([
     { text: "Main Title", options: { fontSize: 28, bold: true } },
     { text: "Subtitle text", options: { fontSize: 18 } }
   ], { x: 0.5, y: 0.5, w: 9, h: 2 });

   // Table:
   slide.addTable([
     [{ text: "Name", options: { bold: true } }, { text: "Age", options: { bold: true } }],
     ["Alice", "30"],
     ["Bob", "25"]
   ], { x: 1, y: 1, w: 8 });

   // Chart (bar, line, pie, etc.):
   slide.addChart(pptx.charts.BAR, [
     { name: "Sales", labels: ["Q1","Q2","Q3","Q4"], values: [100, 150, 130, 200] }
   ], { x: 1, y: 1, w: 8, h: 4 });

   // Image from URL:
   // slide.addImage({ path: "https://example.com/image.png", x: 1, y: 1, w: 4, h: 3 });

   // Shape:
   slide.addShape(pptx.shapes.RECTANGLE, { x: 1, y: 1, w: 4, h: 3, fill: { color: "4472C4" } });

5. SAVE \u2014 ALWAYS end with:
   await pptx.writeFile({ fileName: "Presentation.pptx" });
   // CRITICAL: Without this call, no file is generated. Must be awaited.

### COMPLETE MINIMAL EXAMPLE:
const pptx = new PptxGenJS();
pptx.title = "Project Plan";
pptx.layout = "LAYOUT_WIDE";

const slide1 = pptx.addSlide();
slide1.addText("Project Plan 2026", { x: 1, y: 1.5, w: 8, h: 1.5, fontSize: 36, bold: true, color: "1e3a8a", align: "center" });
slide1.addText("Prepared by Better DeepSeek", { x: 1, y: 3.5, w: 8, h: 0.8, fontSize: 16, align: "center" });

const slide2 = pptx.addSlide();
slide2.addText("Timeline", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true });
slide2.addTable([
  [{ text: "Phase", options: { bold: true, fill: { color: "4472C4" }, color: "FFFFFF" } }, { text: "Duration", options: { bold: true, fill: { color: "4472C4" }, color: "FFFFFF" } }],
  ["Planning", "2 weeks"],
  ["Development", "8 weeks"],
  ["Testing", "3 weeks"]
], { x: 1, y: 1.5, w: 8 });

const slide3 = pptx.addSlide();
slide3.addText("Budget Overview", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true });
slide3.addChart(pptx.charts.PIE, [
  { name: "Budget", labels: ["R&D", "Marketing", "Operations", "Reserve"], values: [40, 25, 20, 15] }
], { x: 1.5, y: 1.5, w: 7, h: 4 });

await pptx.writeFile({ fileName: "ProjectPlan.pptx" });

### COMMON MISTAKES TO AVOID:
- \u2717 \`const PptxGenJS = require('pptxgenjs')\` \u2014 NOT available
- \u2717 \`const PptxGenJS = ...\` \u2014 PptxGenJS is already defined globally
- \u2717 Forgetting \`await\` before \`pptx.writeFile()\` \u2014 it's async, must be awaited
- \u2717 \`pptx.save()\` \u2014 wrong method, use \`pptx.writeFile({ fileName: ... })\`
- \u2717 \`slide.addText("text", x, y, w, h)\` \u2014 wrong! Second arg is an options object
- \u2717 Using \`document.createElement\`, \`fetch\`, \`Blob\` \u2014 these are NOT available in sandbox
- \u2717 \`pptx.write()\` without options \u2014 use \`writeFile\` for file download
- \u2717 Not calling \`pptx.writeFile\` at all \u2014 the most common reason for "no output"

### POSITIONING HELP:
- Slide dimensions: LAYOUT_WIDE = 10" x 5.625", LAYOUT_STANDARD = 10" x 7.5"
- All positions in inches: { x: 0.5, y: 0.5, w: 9, h: 1 }
- (0,0) = top-left corner

### CHART TYPES:
pptx.charts.BAR, pptx.charts.COLUMN, pptx.charts.LINE, pptx.charts.PIE,
pptx.charts.DOUGHNUT, pptx.charts.SCATTER, pptx.charts.AREA, pptx.charts.RADAR

### SHAPES:
pptx.shapes.RECTANGLE, pptx.shapes.OVAL, pptx.shapes.LINE, pptx.shapes.RIGHT_TRIANGLE,
pptx.shapes.PENTAGON, pptx.shapes.HEXAGON, pptx.shapes.CHEVRON, pptx.shapes.STAR_5_POINT
`.trim(),W=`
## docx Library Reference (Word Documents)

### GLOBAL AVAILABILITY
- The \`docx\` library is ALREADY globally available as \`window.docx\`, \`window.DOCX\`, and \`window.Packer\`.
- All library exports are also available as globals: \`Document\`, \`Paragraph\`, \`TextRun\`, \`Table\`, etc.
- Do NOT use \`import\`, \`require\`, or \`const docx = ...\` / \`const DOCX = ...\`.
- Use \`DOCX.save(doc, "filename.docx")\` to trigger download.

### CORRECT API

1. DESTRUCTURE NEEDED CLASSES (optional, for cleaner code):
   const { Document, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, BorderStyle, WidthType } = DOCX;

2. CREATE DOCUMENT:
   const doc = new Document({
     title: "My Document",
     creator: "Better DeepSeek",
     sections: [{ children: [ ... ] }]
   });

3. CONTENT ELEMENTS (use inside children array):

   // Simple paragraph:
   new Paragraph({ children: [new TextRun("Hello World")] })

   // Formatted text:
   new Paragraph({
     children: [
       new TextRun({ text: "Bold text", bold: true, size: 24 }),
       new TextRun({ text: " normal text", size: 20 }),
       new TextRun({ text: " and italic", italics: true, size: 20 })
     ],
     spacing: { after: 200 }
   })

   // Heading:
   new Paragraph({
     text: "Chapter 1",
     heading: HeadingLevel.HEADING_1
   })

   // Bullet list:
   new Paragraph({
     children: [new TextRun("List item")],
     bullet: { level: 0 }
   })

   // Table:
   new Table({
     rows: [
       new TableRow({
         children: [
           new TableCell({ children: [new Paragraph("Header 1")] }),
           new TableCell({ children: [new Paragraph("Header 2")] })
         ]
       }),
       new TableRow({
         children: [
           new TableCell({ children: [new Paragraph("Cell A")] }),
           new TableCell({ children: [new Paragraph("Cell B")] })
         ]
       })
     ]
   })

   // Page break:
   new Paragraph({ pageBreakBefore: true })

4. SAVE \u2014 ALWAYS end with:
   await DOCX.save(doc, "filename.docx");
   // Alternatively: const blob = await DOCX.Packer.toBlob(doc);
   // CRITICAL: Without DOCX.save(), no file is generated.

### COMPLETE MINIMAL EXAMPLE:
const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell } = DOCX;

const doc = new Document({
  creator: "Better DeepSeek",
  title: "Report",
  sections: [{
    children: [
      new Paragraph({
        text: "Annual Report 2026",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "This is the introduction paragraph. ", size: 22 }),
          new TextRun({ text: "Important note in bold.", bold: true, size: 22 })
        ],
        spacing: { after: 300 }
      }),
      new Paragraph({
        text: "Key Findings",
        heading: HeadingLevel.HEADING_2
      }),
      new Paragraph({
        children: [new TextRun("First finding with detailed explanation.")],
        bullet: { level: 0 }
      }),
      new Paragraph({
        children: [new TextRun("Second finding.")],
        bullet: { level: 0 }
      }),
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Metric")] }),
              new TableCell({ children: [new Paragraph("Value")] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Revenue")] }),
              new TableCell({ children: [new Paragraph("$1.2M")] })
            ]
          })
        ]
      })
    ]
  }]
});

await DOCX.save(doc, "AnnualReport.docx");

### COMMON MISTAKES TO AVOID:
- \u2717 \`import { Document } from "docx"\` \u2014 NOT available, don't use import
- \u2717 \`const docx = require("docx")\` \u2014 NOT available
- \u2717 \`const DOCX = ...\` or \`const docx = ...\` \u2014 DOCX/docx is already globally defined
- \u2717 \`new Docx()\` \u2014 wrong! Use \`new Document()\` from the library
- \u2717 \`doc.save("filename.docx")\` \u2014 use \`DOCX.save(doc, "filename.docx")\`
- \u2717 Forgetting \`await\` before \`DOCX.save()\` \u2014 it's async
- \u2717 \`new TextRun("text", { bold: true })\` \u2014 wrong! TextRun takes text as first arg OR options object: \`new TextRun({ text: "text", bold: true })\`
- \u2717 Missing \`sections: [{ children: [...] }]\` \u2014 Document requires at least one section
- \u2717 Using \`document.createElement\`, \`fetch\`, \`Blob\` \u2014 NOT available in sandbox
- \u2717 Forgetting \`new\` keyword before Paragraph, TextRun, etc. \u2014 these are constructors

### COMMONLY USED CLASSES AND THEIR IMPORTS (all available as globals):
- Document, Paragraph, TextRun, Table, TableRow, TableCell
- HeadingLevel (HEADING_1 through HEADING_6)
- AlignmentType (CENTER, LEFT, RIGHT, JUSTIFIED)
- BorderStyle (SINGLE, DOUBLE, DASHED, DOTTED, NONE)
- WidthType (PERCENTAGE, DXA, AUTO)
- PageNumber, Footer, Header, ImageRun
- TabStopPosition, TabStopType
- UnderlineType (SINGLE, DOUBLE, WAVY, DOTTED, DASH)

### TEXT STYLING OPTIONS (inside TextRun):
{ text: string, bold?: boolean, italics?: boolean, size?: number (half-points, e.g. 24 = 12pt),
  color?: string (hex), font?: string, underline?: { type: UnderlineType, color?: string },
  strike?: boolean, superScript?: boolean, subScript?: boolean }

### PARAGRAPH SPACING:
{ spacing: { before: number, after: number, line: number }, indent: { firstLine?: number, left?: number } }
`.trim(),D=[{name:"xlsx",keywords:["excel","spreadsheet","xlsx","xls","sheet","tabular data","workbook","cells",".xlsx"],skill:J},{name:"pptx",keywords:["powerpoint","presentation","slide","pptx",".pptx","slideshow","deck","power point"],skill:G},{name:"docx",keywords:["word","document","docx","msword","word document","doc",".docx","letter","report"],skill:W}];function z(e){if(!e||typeof e!="string")return[];const t=e.toLowerCase(),n=[];for(const r of D)for(const o of r.keywords)if(t.includes(o)){n.push(r.name);break}return n}function Y(e){const t=z(e);if(!t.length)return"";const n=[];for(const r of t){const o=D.find(a=>a.name===r);o&&n.push(o.skill)}return n.length?["<BetterDeepSeek>","[OFFICE SKILL] The user wants to create an office document. Below is the API reference for the required library:","",n.join(`

`),"</BetterDeepSeek>"].join(`
`):""}const K=new Set(["the","a","an","and","or","but","if","then","else","when","at","by","for","with","about","against","is","it","was","were","are","be","been","between","into","through","during","before","after","above","below","to","from","up","down","in","out","on","off","over","under","again","further","once","here","there","all","any","both","each","few","more","most","other","some","such","no","nor","not","only","own","same","so","than","too","very","can","will","just","should","now","how","what","where","why","who","which","ve","veya","ama","fakat","lakin","ancak","ise","ki","de","da","mi","mu","m\xFC","m\u0131","bir","bu","\u015Fu","o","i\xE7in","gibi","kadar","ile","taraf\u0131ndan","hakk\u0131nda","kar\u015F\u0131","aras\u0131nda","i\xE7ine","boyunca","\xF6nce","sonra","\xFCzerinde","alt\u0131nda","yine","daha","en","t\xFCm","her","baz\u0131","hi\xE7","sadece","kendi","ayn\u0131","\xF6yle","b\xF6yle","\xE7ok","yap\u0131lan","yaparak","olan"]);function V(e,t=800,n=5){if(!e||!e.content)return[];const r=e.content.split(/\r?\n/);if(r.length===0)return[];const o=[];let a=0;for(;a<r.length;){const u=[];let s=0;const f=a+1;for(;a<r.length&&(s<t||u.length<3);)u.push(r[a]),s+=r[a].length+1,a++;const c=a;if(o.push({fileName:e.name,content:u.join(`
`),startLine:f,endLine:c}),a>=r.length)break;a=Math.max(f,a-n)}return o}function L(e){return e?(String(e).toLowerCase().match(/[a-z0-9_\u015f\u00e7g\u00f6\u0131\u00fc]+/gi)||[]).filter(n=>n.length>=2&&!K.has(n)):[]}function Q(e,t,n=5){if(!e||!t||!t.length)return[];const r=[];for(const y of t)r.push(...V(y,800,5));if(r.length===0)return[];const o=L(e);if(o.length===0)return[];const a=r.length,u=r.map(y=>L(y.content)),s=u.map(y=>y.length),c=s.reduce((y,k)=>y+k,0)/a||1,h={};for(const y of o){h[y]=0;for(const k of u)k.includes(y)&&h[y]++}const m=1.2,E=.75,x=[];for(let y=0;y<a;y++){const k=r[y],g=u[y],w=s[y];let i=0;const l={};for(const d of g)l[d]=(l[d]||0)+1;for(const d of o){const S=l[d]||0;if(S===0)continue;const b=h[d]||0,R=Math.log(1+(a-b+.5)/(b+.5))*(S*(m+1))/(S+m*(1-E+E*(w/c)));i+=R}const p=String(k.fileName).toLowerCase();for(const d of o)p.includes(d)&&(i+=12);i>0&&x.push({...k,score:i})}return x.sort((y,k)=>k.score-y.score).slice(0,Math.max(1,n))}function Z(e,t="Project"){if(!e||!e.length)return"";let n=`<BDS:PROJECT_CONTEXT>
`;n+=`You are working on the project "${t}". Based on the user's latest prompt, here are the most relevant sections of the project files:

`;for(const r of e){const o=r.fileName.split(".").pop()||"";n+=`--- [FILE: ${r.fileName} (Lines ${r.startLine}-${r.endLine})] ---
`,n+=`\`\`\`${o}
`,n+=r.content+`
`,n+="```\n\n"}return n+="</BDS:PROJECT_CONTEXT>",n}function I(e,t){var x,y,k;t.sessionUserMsgCounts||(t.sessionUserMsgCounts={});const n=ee(e),r=te(e);let o=1;n&&n.length>0?(o=n.filter(g=>{const w=String(g.role||g.author||"").toLowerCase();return w==="user"||w==="human"}).length,t.sessionUserMsgCounts[r]=o):typeof e.prompt=="string"&&(e.message_id===1||e.parent_message_id==null?o=1:o=(t.sessionUserMsgCounts[r]||0)+1,t.sessionUserMsgCounts[r]=o);let a=!1,u=null;if(n&&n.length>0){u=N(n)||n[n.length-1];const g=A(u);if(g){const w=B(g),i=ne(n,u);let l=!1;const p=t.config.systemPromptInjectionFrequency||"first";if(p==="always")l=!0;else if(p==="every_x"){const S=t.config.systemPromptInjectionInterval||3;(o-1)%S===0?l=!0:i||(l=!0)}else l=!i,(n.length>1||t.hasInjected&&t.hasInjected(r))&&(l=!1);const d=O(w,r,t,l,n,u);window.dispatchEvent(new CustomEvent("bds:mutation-applied",{detail:JSON.stringify({conversationId:r,injectedText:d||"",userPrompt:w})})),d?(C(u,`${d}

${w}`),a=!0):w!==g&&(C(u,w),a=!0)}}else if(typeof e.prompt=="string"){const g=B(e.prompt),w=e.message_id===1||e.parent_message_id==null,i=t.config.systemPromptInjectionFrequency||"first";let l=!1;if(i==="always")l=!0;else if(i==="every_x"){const d=t.config.systemPromptInjectionInterval||3;(w||(o-1)%d===0)&&(l=!0)}else l=w;const p=O(g,r,t,l,null,null);window.dispatchEvent(new CustomEvent("bds:mutation-applied",{detail:JSON.stringify({conversationId:r,injectedText:p||"",userPrompt:g})})),p?(e.prompt=`${p}

${g}`,a=!0):g!==e.prompt&&(e.prompt=g,a=!0)}const s=(x=t.config)==null?void 0:x.modelInputLimits,f=e.model||((y=e.data)==null?void 0:y.model)||((k=e.chat)==null?void 0:k.model)||"",c=String(f).toLowerCase();let h="instant",m="payload";if(c)c.includes("vision")?h="vision":c.includes("reasoner")||c.includes("deepthink")||c.includes("r1")?h="deepthink":(c.includes("expert")||c.includes("pro"))&&(h="expert");else{const g=Te();g&&(h=g,m="dom")}const E=s?s[h]??163840:163840;if(n&&n.length>0){const g=N(n);if(g){const w=A(g);if(console.warn(`[BDS] Guard check: model="${c}" payload.model=${e.model} source=${m} type=${h} limit=${E} msgLen=${w.length} limits=${JSON.stringify(s)}`),w.length>E){const i=`

...[truncated by Better DeepSeek]...`,l=w.slice(0,E-i.length)+i;C(g,l),a=!0,console.warn(`[BDS] TRUNCATED user message from ${w.length} to ${E} chars`)}}}else if(typeof e.prompt=="string"&&(console.warn(`[BDS] Guard check (prompt): model="${c}" payload.model=${e.model} source=${m} type=${h} limit=${E} msgLen=${e.prompt.length} limits=${JSON.stringify(s)}`),e.prompt.length>E)){const g=`

...[truncated by Better DeepSeek]...`;e.prompt=e.prompt.slice(0,E-g.length)+g,a=!0,console.warn(`[BDS] TRUNCATED prompt from ${e.prompt.length} to ${E} chars`)}return{changed:a,payload:e}}function ee(e){return Array.isArray(e.messages)?e.messages:e.data&&Array.isArray(e.data.messages)?e.data.messages:e.chat&&Array.isArray(e.chat.messages)?e.chat.messages:null}function te(e){return String(e.conversation_id||e.conversationId||e.chat_session_id||e.chat_id||e.id||"default")}function N(e){for(let t=e.length-1;t>=0;t-=1){const n=e[t];if(!n||typeof n!="object")continue;const r=String(n.role||n.author||"").toLowerCase();if(r==="user"||r==="human")return n}return null}function A(e){return e?typeof e.content=="string"?e.content:Array.isArray(e.content)?e.content.map(t=>typeof t=="string"?t:t&&typeof t.text=="string"?t.text:"").join(`
`):typeof e.prompt=="string"?e.prompt:"":""}function C(e,t){if(e){if(typeof e.content=="string"||e.content==null){e.content=t;return}if(Array.isArray(e.content)){e.content=[{type:"text",text:t}];return}if(typeof e.prompt=="string"){e.prompt=t;return}e.content=t}}function ne(e,t=null){if(!Array.isArray(e))return!1;for(const n of e){if(n===t)continue;if(A(n).includes("<BetterDeepSeek>"))return!0}return!1}function O(e,t,n,r=!1,o=null,a=null){var l,p;const u=[],s=re(e,t,n);s&&u.push(s);const f=Ee(n);f&&u.push(f);const c=ke(n);c&&(u.push(c),(l=n.config)!=null&&l.deepCode&&(n.config.deepCode.pendingReport=null),typeof window<"u"&&window.dispatchEvent(new CustomEvent("bds:clear-harness-report")));const h=n.config.systemPromptEntries||[];if(h.length>0){const d=n.sessionUserMsgCounts[t]||1;for(const S of h)S.content.trim()&&ge(S,d,t,n)&&(u.push(`<BetterDeepSeek>
${S.content.trim()}
</BetterDeepSeek>`),n.markEntryInjected&&n.markEntryInjected(t,S.id))}else r&&n.config.systemPrompt.trim()&&!n.config.disableSystemPrompt&&(u.push(`<BetterDeepSeek>
${n.config.systemPrompt.trim()}
</BetterDeepSeek>`),n.markInjected&&n.markInjected(t));const m=_(n.config.skills);let E=null;if(!r&&o&&(E=ye(o,a)),r||m&&m!==E){const d=ie(n);d&&u.push(d)}const x=ue(e,n,o);x&&u.push(x);const y=Y(e);y&&u.push(y);const k=n.config.activeCharacter;if(k){let d=o?Se(o,a):null;if(!d&&n.getLastChar&&(d=n.getLastChar(t)),!d&&n.currentSessionChar&&(o==null?void 0:o.length)>1&&(d=n.currentSessionChar),r||!d||d!==k.name){const S=fe(n);S&&(u.push(S),n.setLastChar&&n.setLastChar(t,k.name),n.currentSessionChar=k.name)}}n.isNextVoiceMessage&&(u.push("<BetterDeepSeek>User send this message using voice recorder tool.</BetterDeepSeek>"),n.isNextVoiceMessage=!1);const g=n.config&&n.config.activeProject;if(g){let d=null;if(!r&&o&&(d=be(o,a)),r||!d||d!==g.name){const S=he(n);S&&u.push(S)}if(n.config.projectRagEnabled&&Array.isArray(g.files)&&g.files.length>0){const S=Number(n.config.projectRagLimit)||5,b=Q(e,g.files,S);if(b&&b.length>0){const T=Z(b,g.name);T&&u.push(T)}}}if(r){const d=pe(n);d&&u.push(d)}const w=se((p=n.config)==null?void 0:p.mcpToolSchemas);let i=null;if(!r&&o&&(i=we(o,a)),r||w&&w!==i){const d=me(n,w);d&&u.push(d)}return u.join(`

`)}function re(e,t,n){var o;const r=(o=n.config)==null?void 0:o.deepResearch;return!(r!=null&&r.enabled)||!r.runId?"":(r.enabled=!1,oe(r.runId,t,e),["<BetterDeepSeek>",'[BDS:DEEP_RESEARCH] The DeepResearch toggle is enabled. Treat this exactly as the user asking: "Perform Deep Research on the following request."',`Run ID: ${r.runId}`,"","CRITICAL: In this first turn, you must ONLY produce a research plan. Do NOT browse or search. Do NOT produce an ordinary answer. Do NOT produce a direct report.",`Output ONLY a plan using: <BDS:DEEP_RESEARCH_PLAN runId="${r.runId}">JSON</BDS:DEEP_RESEARCH_PLAN>`,"After this turn, BDS will execute steps one-by-one. After each step result is provided, analyze it before continuing. Do NOT skip ahead to the final report until BDS tells you all steps are complete.","","The JSON plan must include:",'- "title": A short descriptive title for the research','- "steps": An array of research steps, each with:','  - "id": step number','  - "action": "search" or "fetch"','  - "query": a specific search query or URL to fetch','  - "purpose": why this step is needed','  - "sourceType": for search steps, one of "general", "docs", "news", "reviews", "academic", or "commerce"',"","Search steps must use narrow queries with named entities, constraints, dates or locations, product or version names, and clear source intent.","",`User research question: ${e}`,"</BetterDeepSeek>"].join(`
`))}function oe(e,t,n){typeof window>"u"||!window.dispatchEvent||window.dispatchEvent(new CustomEvent("bds:deep-research-started",{detail:JSON.stringify({runId:e,conversationId:t,userPrompt:n,timestamp:Date.now()})}))}function ie(e){if(!e.config.skills.length)return"";const t=e.config.skills.map(n=>`## ${n.name}
${n.content.trim()}`).join(`

`);return`<BetterDeepSeek> <BDS:SKILLS fingerprint="${_(e.config.skills)}">
${t}
</BDS:SKILLS> </BetterDeepSeek>`}function _(e){return!Array.isArray(e)||!e.length?"":e.map(t=>`${t.name}:${(t.content||"").length}`).sort().join("|")}function se(e){return!Array.isArray(e)||!e.length?"":e.map(t=>`${t.serverName}:${t.toolName}:${JSON.stringify(t.inputSchema||{})}`).sort().join("|")}function ae(e){if(!Array.isArray(e))return null;for(let t=e.length-1;t>=0;t--){const n=e[t];if(!n||typeof n!="object")continue;const r=String(n.role||n.author||"").toLowerCase();if(!(r==="user"||r==="human")&&(r==="assistant"||r==="ai"||r==="bot"))return n}return null}function P(e){return!e||typeof e!="string"?[]:e.split(new RegExp("[_-]|\\s+|(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])")).map(t=>t.toLowerCase().replace(/[^a-z0-9]/g,"")).filter(t=>t.length>0)}function ce(e,t){if(!e.length||!t.length)return 0;const n=new Set(t);let r=0;for(const o of e)n.has(o)&&r++;return r/e.length}function le(e,t){return t===1?e>=1:e>=.5}function ue(e,t,n){if(t.config.disableMemory||!t.config.memories.length)return"";const r=n?ae(n):null,o=r?A(r):"",a=[e,o].filter(Boolean).join(" "),u=P(a),s=[];for(const c of t.config.memories){if(c.importance==="always"){s.push(c);continue}if(!c.key)continue;const h=P(c.key);if(!h.length){a.toLowerCase().includes(c.key.toLowerCase())&&s.push(c);continue}const m=[...new Set(h)],E=ce(m,u);(le(E,m.length)||a.toLowerCase().includes(c.key.toLowerCase()))&&s.push(c)}return s.length?`<BetterDeepSeek>
${s.map(c=>`<BDS:memory_calls importance="${c.importance}">${c.key}: ${de(c.value)}</BDS:memory_calls>`).join(`
`)}
</BetterDeepSeek>`:""}function de(e){return String(e).replace(/<\//g,"<\\/").trim()}function he(e){const t=e.config&&e.config.activeProject;if(!t)return"";let n="";return t.instructions&&t.instructions.trim()&&(n+=t.instructions.trim()+`
`),`<BetterDeepSeek>
<BDS:PROJECT name="${t.name}">
${n}</BDS:PROJECT>
</BetterDeepSeek>`}function fe(e){const t=e.config.activeCharacter;if(!t||!t.content)return"";let n=`Character Name: ${t.name}
`;return t.usage&&(n+=`Usage Domain: ${t.usage}
`),n+=`---
${t.content.trim()}`,`<BetterDeepSeek> <BDS:RP>
${n}
</BDS:RP> </BetterDeepSeek>`}function pe(e){const t=[];if(e.config.injectSystemDateTime!==!1){const r=new Date;t.push(`User's System Date & Time: ${r.toLocaleString()}`)}const n=e.config.preferredLang;return n&&n.trim()&&t.push(`Always respond in ${n.trim()}.`),t.length===0?"":`<BetterDeepSeek>
${t.join(`
`)}
</BetterDeepSeek>`}function me(e,t){var w;const n=(w=e.config)==null?void 0:w.mcpToolSchemas;if(!Array.isArray(n)||!n.length)return"";const r=Number(e.config.mcpInlineMaxChars)||8e3,o=n.length,a=[`<BetterDeepSeek> <BDS:MCP fingerprint="${t}">`,"You have access to the following MCP (Model Context Protocol) tools via remote servers.",`To invoke them, use: <BDS:AUTO:MCP url="SERVER_NAME_OR_URL" tool="TOOL_NAME" args='{"key":"value"}'>`,"The extension will call the tool and inject the result.","Important: Only ONE tool per response. Wait for the result before invoking another. Never invoke multiple tools at the same time.","","Available tools:"].join(`
`),u="</BDS:MCP> </BetterDeepSeek>",s=n.map(i=>{let l=`- Server: ${i.serverName} (${i.serverUrl||i.serverName}) | Tool: ${i.toolName}`;if(i.description&&(l+=` | Description: ${i.description}`),i.inputSchema&&typeof i.inputSchema=="object"){const p=i.inputSchema.properties;if(p){const d=Object.entries(p).map(([S,b])=>{const T=(i.inputSchema.required||[]).includes(S)?" (required)":"";return`${S}: ${(b==null?void 0:b.type)||"any"}${T}`});d.length&&(l+=` | Params: ${d.join(", ")}`)}}return l}),f=[a,...s,u].join(`
`);if(f.length<=r)return f;const c=i=>`
... and ${i} more tool(s) not shown (MCP tool list exceeds inline character limit \u2014 all tools are still available for invocation).`,h=c(1),m=a.length+1+u.length+h.length;let E=r-m;const x=[];for(const i of s){const l=i.length+1;if(E-l<0)break;E-=l,x.push(i)}const y=o-x.length,k=c(y);let g=[a,...x,k,u].join(`
`);for(;x.length>0&&g.length>r;){x.pop();const i=o-x.length,l=c(i);g=[a,...x,l,u].join(`
`)}return g}function ge(e,t,n,r){const a=(r.getInjectedEntries?r.getInjectedEntries(n):[]).includes(e.id);switch(e.schedule.type){case"first":return!a;case"always":return!0;case"interval":{const u=e.schedule.everyNTurns||3;return a?(t-1)%u===0:!0}default:return!1}}function Se(e,t=null){if(!Array.isArray(e))return null;for(let n=e.length-1;n>=0;n--){const r=e[n];if(r===t)continue;const o=A(r);if(!o.includes("<BDS:RP>"))continue;const a=o.match(/Character Name:\s*(.*?)\n/);if(a&&a[1])return a[1].trim()}return null}function ye(e,t=null){if(!Array.isArray(e))return null;for(let n=e.length-1;n>=0;n--){const r=e[n];if(r===t)continue;const a=A(r).match(/<BDS:SKILLS fingerprint="(.*?)">/);if(a&&a[1])return a[1]}return null}function we(e,t=null){if(!Array.isArray(e))return null;for(let n=e.length-1;n>=0;n--){const r=e[n];if(r===t)continue;const a=A(r).match(/<BDS:MCP fingerprint="(.*?)">/);if(a&&a[1])return a[1]}return null}function be(e,t=null){if(!Array.isArray(e))return null;for(let n=e.length-1;n>=0;n--){const r=e[n];if(r===t)continue;const a=A(r).match(/<BDS:PROJECT name="(.*?)">/);if(a&&a[1])return a[1]}return null}function B(e){let t=String(e||"");return t=t.replace(/<BetterDeepSeek>([\s\S]*?)<\/BetterDeepSeek>/gi,(n,r)=>r.includes("[BDS:AUTO]")||r.includes("[BDS:DEEP_RESEARCH]")||/<BDS:memory_calls[\s>]/i.test(r)?n:""),t=t.replace(/<BDS:SKILLS>[\s\S]*?<\/BDS:SKILLS>/gi,""),t=t.replace(/<BDS:memory_calls[^>]*>[\s\S]*?<\/BDS:memory_calls>/gi,""),t=t.replace(/<BDS:RP>[\s\S]*?<\/BDS:RP>/gi,""),t=t.replace(/<BDS:PROJECT[^>]*>[\s\S]*?<\/BDS:PROJECT>/gi,""),t=t.replace(/<BDS:PROJECT_CONTEXT>[\s\S]*?<\/BDS:PROJECT_CONTEXT>/gi,""),t.trim()}function Te(){try{const e=document.querySelector("._46a12ab");if(!e)return null;const t=(e.textContent||"").toLowerCase().trim();return t.includes("vision")?"vision":t.includes("expert")||t.includes("reasoner")?"expert":t.includes("deepthink")||t.includes("deep think")||t.includes("r1")?"deepthink":t.includes("instant")||t.includes("chat")||t.includes("flash")?"instant":null}catch{return null}}function Ee(e){const t=e&&e.config&&e.config.deepCode;if(!t||!t.enabled)return"";const n=t.manualPath||t.activeDirectory||"active directory",r=t.fileTree?`
${String(t.fileTree).trim()}

The tree above is an ORIENTATION MAP of the codebase (top few levels, indexed text files only). It is not a verified description of any file's contents \u2014 always confirm actual structure with FILE_READ, LIST_DIR, or SEARCH_IN_DIRECTORY before referencing details.
`:"";return`<BetterDeepSeek>
[DEEP_CODE_MODE_ACTIVE]
DeepCode mode is ENABLED for local codebase directory: "${n}".

${r}

You are a technical requirements agent. Your job is NOT to write code yourself.
Your job is to turn an unstructured conversation with the user into a single,
unambiguous, self-contained task specification that a separate coding agent
(DeepSeek Harness) can execute without asking follow-up questions.

You have four tools:

1. READ FILE
   <BDS:AUTO:FILE_READ path="relative/path/to/file"/>
   Returns full file content. Use before referencing any file's structure,
   exports, function signatures, or existing logic.

2. LIST DIRECTORY
   <BDS:AUTO:LIST_DIR path="relative/path/to/directory"/>
   Returns the immediate files and folders inside a directory (folders are
   suffixed with "/"). Use to discover where a file or feature lives when the
   file tree is too shallow, or to enumerate a directory without reading
   every file.

3. SEARCH CODEBASE
   <BDS:AUTO:SEARCH_IN_DIRECTORY queries="query terms"/>
   Returns matching snippets with file paths and line numbers. Use to locate
   where a feature lives, find call sites, or check whether something already
   exists before proposing it.

4. DISPATCH HARNESS TASK
   <BDS:HARNESS_TASK cwd="${n}">
   ...task spec...
   </BDS:HARNESS_TASK>
   Terminal action. Once emitted, the task is sent for execution. Never emit
   more than one BDS:HARNESS_TASK block per dispatch, and never emit it
   speculatively \u2014 see DISPATCH GATE below.

   NEVER use more than one TOOL in a single message.
   
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
OPERATING PRINCIPLES
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

1. Conversation first, dispatch last.
   Your default mode is discussion. The user is describing a feature, bug, or
   change conversationally and may be vague, contradictory, or incomplete at
   first. Do not treat the first message as a dispatch trigger. Treat it as
   the opening of a requirements conversation.

2. Investigate before you ask, ask before you assume.
   Before asking the user a clarifying question, check whether the codebase
   already answers it. Use SEARCH_IN_DIRECTORY to locate relevant files, then
   FILE_READ or LIST_DIR to confirm actual structure, naming, and patterns. Only ask the
   user when the answer genuinely cannot be determined from the code (e.g.
   product intent, priority, desired UX behavior, scope boundaries).
   Never guess at a file path, function name, or existing behavior - verify
   it with a tool call or state explicitly that it's unverified.

3. Never fabricate codebase facts.
   If you have not read a file, you do not know what it contains. Do not
   describe existing implementation details, file structure, or behavior
   you have not confirmed via FILE_READ, LIST_DIR, or SEARCH_IN_DIRECTORY in this
   session. If asked something you can't verify, say so and investigate.

4. Match existing conventions.
   Before drafting the task spec, inspect enough of the surrounding code to
   identify: language/framework, naming conventions, error handling style,
   test framework (if any), module boundaries. The task spec you hand to
   Harness must instruct it to follow what you found, not generic best
   practice.
5. NEVER use more than one TOOL in a single message.
   If you need to use more than one tool, use multiple messages. Wait for the previous tool response before using the next tool.
   The harness task is also a tool. So never use more than one tool in a single message.
6. NEVER use more than one HARNESS_TASK in a single message.
   If you need to use more than one harness task, use multiple messages.
   Wait for the previous harness task response before using the next harness task.
   


\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
CONVERSATION FLOW
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

PHASE 1 \u2014 Understand intent
Restate what you understand the user wants in one or two sentences and
confirm the type of work: new feature, bug fix, refactor, or other. If the
user reports a bug, ask (or investigate) for reproduction steps, expected
vs actual behavior, and whether it's isolated or systemic.

PHASE 2 \u2014 Investigate
Use SEARCH_IN_DIRECTORY, LIST_DIR, and FILE_READ to locate the relevant subsystem(s).
Do this silently as part of your reasoning, not as a narrated play-by-play \u2014
surface only what's relevant to the user (e.g. "this touches the auth
middleware in src/auth/session.ts"). Identify:
- Entry points and files that will need to change
- Existing patterns to follow (naming, error handling, tests)
- Adjacent code that could be affected (call sites, shared state, config)
- Whether the request conflicts with or duplicates existing functionality
- IMPORTANT: If you are unable to carry out the investigation using your existing resources and tools, you can assign the task to Harness. Your tools are insufficient for a comprehensive investigation. With your tools, you can only get a rough idea about the project.

PHASE 3 \u2014 Close ambiguity
Resolve anything that materially changes the implementation before drafting
the spec:
- Scope boundaries (what's explicitly NOT included)
- Edge cases and error states the user cares about
- Backward compatibility / migration concerns
- Non-functional constraints (performance, security, platform support)
- Acceptance criteria \u2014 how will the user know it's done correctly?
Ask only what you couldn't resolve via investigation. Batch clarifying
questions instead of drip-feeding them one at a time, unless the user's
answer to one materially changes what else you'd ask.

PHASE 4 \u2014 Draft and confirm
Before dispatching, present a compact summary of the task spec you intend
to send (objective, key files, acceptance criteria) and get explicit user
confirmation. Do not skip this for anything non-trivial. Skip confirmation
only for genuinely trivial, low-ambiguity asks the user has already fully
specified.

PHASE 5 \u2014 Dispatch
Once confirmed, emit exactly one BDS:HARNESS_TASK block built to the spec
below.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
DISPATCH GATE \u2014 do not emit BDS:HARNESS_TASK unless ALL of these hold
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
- The objective is a single, coherent unit of work (split multi-part
  requests into sequential dispatches rather than one sprawling task)
- You have identified the specific file(s) or module(s) involved, verified
  via tool calls, not inferred from the file tree alone
- Acceptance criteria are concrete and checkable, not vague ("should work
  better")
- Scope boundaries are explicit \u2014 what Harness should NOT touch
- The user has confirmed the summary (or the task is trivial and fully
  specified)
If any of these is unmet, stay in conversation and resolve it first.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
TASK SPEC FORMAT (contents of BDS:HARNESS_TASK)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Write the task spec in this structure. Omit a section only if genuinely
empty (e.g. no out-of-scope items) \u2014 do not pad sections to look complete.

## Objective
One or two sentences. What outcome defines success, not how to get there.

## Context
Why this is needed, in the user's own framing. Include relevant background
uncovered during investigation (existing behavior, related bug reports,
prior implementation attempts) that Harness needs to avoid re-deriving.

## Affected files
Concrete paths, confirmed via FILE_READ/SEARCH_IN_DIRECTORY. For each: what
currently exists there and what needs to change. If new files are needed,
say so explicitly and where they should live, following the project's
existing module layout.

## Implementation notes
Conventions to follow (naming, error handling, existing patterns to mirror),
specific technical approach if the user specified one, and any constraints
discovered during investigation (e.g. "this function is called from three
other places, see src/x.ts:42, src/y.ts:88 \u2014 signature must stay compatible").

## Edge cases & constraints
Explicit list of edge cases, error states, and non-functional requirements
(performance, security, platform support, backward compatibility) that must
be handled.

## Acceptance criteria
Checkable, specific conditions. Prefer "X returns Y when Z" over "X works
correctly." Include how to verify (manual steps, existing test suite,
specific commands) if the project has a test/build setup \u2014 check for this
via investigation rather than assuming.

## Out of scope
What Harness should explicitly NOT do, especially anything adjacent that
might be tempting to "fix while you're in there." Keeps the diff reviewable.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
STYLE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
- Be direct. No filler, no restating the obvious back to the user.
- When something in the codebase contradicts what the user described,
  say so plainly before proceeding \u2014 don't silently reconcile it.
- The task spec is written for an autonomous coding agent, not for the user:
  it should be dense, unambiguous, and self-contained. Assume Harness has no
  access to this conversation, only the spec and the codebase.
- Never emit BDS:HARNESS_TASK mid-explanation. It is always the final action
  of a turn.
</BetterDeepSeek>`}function ke(e){const t=e&&e.config&&e.config.deepCode,n=t&&t.pendingReport;if(!n||!n.report||!n.report.trim())return"";const r=n.cwd?` cwd="${n.cwd}"`:"",o=n.sessionId?` sessionId="${n.sessionId}"`:"";return`<BetterDeepSeek>
[DEEPSEEK_HARNESS_EXECUTION_RESULT]
The local DeepSeek Harness agent has finished executing the task${n.cwd?` in "${n.cwd}"`:""}.
Here is the execution report and final output:

<BDS:HARNESS_RESULT${r}${o}>
${n.report.trim()}
</BDS:HARNESS_RESULT>
</BetterDeepSeek>`}function xe(e,t,n,r){const o=window.fetch;window.fetch=async function(u,s){try{const f=Ae(u);if(!t(f))return o.apply(this,arguments);if(Le(u,s,e),f.includes("/api/v0/chat_session/fetch_page")){const c=await o.apply(this,arguments);return c.clone().json().then(m=>{window.dispatchEvent(new CustomEvent("bds:session-data",{detail:JSON.stringify(m)}))}).catch(()=>{}),c}if(f.includes("/api/v0/chat/history_messages")){const c=await o.apply(this,arguments);return c.clone().json().then(m=>{window.dispatchEvent(new CustomEvent("bds:history-msgs",{detail:JSON.stringify(m)}))}).catch(()=>{}),c}n(f);try{const c=await Re(u,s,e);if(!c){const m=await o.apply(this,arguments);return j(m,f,c==null?void 0:c.modelName),m}const h=await o.call(this,c.input,c.init);return h&&h.status>=500&&window.dispatchEvent(new CustomEvent("bds:network-error",{detail:JSON.stringify({url:f,status:h.status,type:"fetch"})})),j(h,f,c.modelName),h}catch(c){throw window.dispatchEvent(new CustomEvent("bds:network-error",{detail:JSON.stringify({url:f,status:0,type:"fetch",error:String(c)})})),c}finally{r(f)}}catch(f){return console.warn("[BetterDeepSeek] Request patch failed:",f),o.apply(this,arguments)}}}function j(e,t,n){if(!(!e||!e.clone))try{const r=e.clone();Ce(r,n).catch(()=>{})}catch{}}function Ae(e){return typeof e=="string"?e:e instanceof URL?e.toString():e instanceof Request?e.url:""}async function Re(e,t,n){const r=await De(e,t);if(!r)return null;let o;try{o=JSON.parse(r)}catch{return null}const a=o.model||null,u=I(o,n);if(!u.changed)return null;const s=JSON.stringify(u.payload),f=t&&t.headers?t.headers:e instanceof Request?e.headers:void 0,c=new Headers(f||{});c.set("content-type","application/json");const h={method:t&&t.method||(e instanceof Request?e.method:"POST"),headers:c,body:s,credentials:t&&t.credentials||(e instanceof Request?e.credentials:void 0),cache:t&&t.cache||(e instanceof Request?e.cache:void 0),mode:t&&t.mode||(e instanceof Request?e.mode:void 0),redirect:t&&t.redirect||(e instanceof Request?e.redirect:void 0),referrer:t&&t.referrer||(e instanceof Request?e.referrer:void 0),referrerPolicy:t&&t.referrerPolicy||(e instanceof Request?e.referrerPolicy:void 0),keepalive:t&&t.keepalive||(e instanceof Request?e.keepalive:void 0),integrity:t&&t.integrity||(e instanceof Request?e.integrity:void 0),signal:t&&t.signal||(e instanceof Request?e.signal:void 0)};return{input:typeof e=="string"||e instanceof URL?e:e.url,init:h,modelName:a}}async function Ce(e,t){try{const n=e.headers.get("content-type")||"";if(n.includes("text/event-stream")||n.includes("stream"))await ve(e,t);else{const r=await e.text();try{const o=JSON.parse(r),a=(o==null?void 0:o.usage)||(o==null?void 0:o.token_usage);a&&M(a.prompt_tokens||a.input_tokens||0,a.completion_tokens||a.output_tokens||0,t)}catch{}}}catch{}}async function ve(e,t){var u;const n=(u=e.body)==null?void 0:u.getReader();if(!n)return;const r=new TextDecoder;let o="";try{for(;;){const{done:s,value:f}=await n.read();if(f&&(o+=r.decode(f,{stream:!s})),s)break}}catch{return}const a=o.split(`
`);for(let s=a.length-1;s>=0;s--){const f=a[s].trim();if(!f.startsWith("data: "))continue;const c=f.slice(6).trim();if(c!=="[DONE]")try{const h=JSON.parse(c),m=(h==null?void 0:h.usage)||(h==null?void 0:h.token_usage);if(m){M(m.prompt_tokens||m.input_tokens||0,m.completion_tokens||m.output_tokens||0,t||(h==null?void 0:h.model));break}}catch{}}}function M(e,t,n){typeof e!="number"&&typeof t!="number"||window.dispatchEvent(new CustomEvent("bds:token-usage",{detail:JSON.stringify({inputTokens:Number(e)||0,outputTokens:Number(t)||0,modelName:n||null,timestamp:Date.now()})}))}async function De(e,t){return t&&typeof t.body=="string"?t.body:t&&t.body instanceof URLSearchParams?t.body.toString():e instanceof Request?e.clone().text():""}function Le(e,t,n){try{let r;if(t&&t.headers){const o=t.headers;if(o instanceof Headers)r=o.get("authorization");else if(Array.isArray(o)){for(const[a,u]of o)if(a.toLowerCase()==="authorization"){r=u;break}}else typeof o=="object"&&(r=o.Authorization||o.authorization)}!r&&e instanceof Request&&(r=e.headers.get("authorization")),r&&typeof(n==null?void 0:n.setAuthToken)=="function"&&n.setAuthToken(r)}catch{}}function Ie(e,t,n,r){const o=XMLHttpRequest.prototype.open,a=XMLHttpRequest.prototype.send,u=XMLHttpRequest.prototype.setRequestHeader;XMLHttpRequest.prototype.open=function(f,c){return this.__bdsRequestMeta={method:String(f||"GET").toUpperCase(),url:String(c||"")},o.apply(this,arguments)},XMLHttpRequest.prototype.setRequestHeader=function(f,c){return f&&String(f).toLowerCase()==="authorization"&&typeof(e==null?void 0:e.setAuthToken)=="function"&&e.setAuthToken(String(c||"")),u.apply(this,arguments)},XMLHttpRequest.prototype.send=function(f){try{const c=this.__bdsRequestMeta||{};if(!t(c.url))return a.call(this,f);if(c.url.includes("/api/v0/chat_session/fetch_page"))return this.addEventListener("load",()=>{try{const i=JSON.parse(this.responseText);window.dispatchEvent(new CustomEvent("bds:session-data",{detail:JSON.stringify(i)}))}catch{}}),a.call(this,f);if(c.url.includes("/api/v0/chat/history_messages"))return this.addEventListener("load",()=>{try{const i=JSON.parse(this.responseText);window.dispatchEvent(new CustomEvent("bds:history-msgs",{detail:JSON.stringify(i)}))}catch{}}),a.call(this,f);n(c.url);let h=!1;const m=()=>{h||(h=!0,(this.status>=500||this.status===0)&&window.dispatchEvent(new CustomEvent("bds:network-error",{detail:JSON.stringify({url:c.url,status:this.status,type:"xhr"})})),r(c.url))};this.addEventListener("loadend",m,{once:!0});const E=Ne(f);if(!E)return a.call(this,f);const x=JSON.parse(E),y=x.model||null,k=I(x,e);if(!k.changed)return a.call(this,f);const g=JSON.stringify(k.payload),w=this;return this.addEventListener("load",()=>{try{const i=w.responseText;i&&Oe(i,w,y)}catch{}},{once:!0}),a.call(this,g)}catch(c){const h=this.__bdsRequestMeta||{};console.warn("[BetterDeepSeek] XHR patch failed:",c);try{return a.call(this,f)}catch(m){throw t(h.url)&&r(h.url),m}}}}function Ne(e){return typeof e=="string"?e:e instanceof URLSearchParams?e.toString():""}function Oe(e,t,n){var r;try{if((((r=t.getResponseHeader)==null?void 0:r.call(t,"content-type"))||"").includes("text/event-stream")||e.startsWith("data: ")){const a=e.split(`
`);for(let u=a.length-1;u>=0;u--){const s=a[u].trim();if(!s.startsWith("data: "))continue;const f=s.slice(6).trim();if(f!=="[DONE]")try{const c=JSON.parse(f),h=c==null?void 0:c.usage;if(h){window.dispatchEvent(new CustomEvent("bds:token-usage",{detail:JSON.stringify({inputTokens:h.prompt_tokens||h.input_tokens||0,outputTokens:h.completion_tokens||h.output_tokens||0,modelName:n||(c==null?void 0:c.model)||null,timestamp:Date.now()})}));break}}catch{}}}}catch{}}(function(){"use strict";const e={configUpdate:"bds:config-update",deepResearchConfigUpdate:"bds:deep-research-config-update",requestConfig:"bds:request-config",markVoiceMessage:"bds:mark-voice-message",sessionData:"bds:session-data"},t="/api/v0/chat_session/fetch_page",n="/api/v0/chat/history_messages",r="/api/v0/chat/completion";function o(){try{return JSON.parse(localStorage.getItem("bds_injected_chats")||"[]")}catch{return[]}}function a(i){const l=o();l.includes(i)||(l.push(i),l.length>50&&l.shift(),localStorage.setItem("bds_injected_chats",JSON.stringify(l)))}function u(){try{return JSON.parse(localStorage.getItem("bds_injected_chars")||"{}")}catch{return{}}}function s(i,l){const p=u();p[i]=l;const d=Object.keys(p);d.length>50&&delete p[d[0]],localStorage.setItem("bds_injected_chars",JSON.stringify(p))}function f(i){try{return JSON.parse(localStorage.getItem("bds_injected_entries")||"{}")[i]||[]}catch{return[]}}function c(i,l){try{const p=JSON.parse(localStorage.getItem("bds_injected_entries")||"{}");p[i]||(p[i]=[]),p[i].includes(l)||p[i].push(l);const d=Object.keys(p);d.length>50&&delete p[d[0]],localStorage.setItem("bds_injected_entries",JSON.stringify(p))}catch{}}function h(){var i,l;try{for(let d=0;d<localStorage.length;d++){const S=localStorage.key(d);if(S&&/token|auth|session/i.test(S)){const b=localStorage.getItem(S);if(!b)continue;if(b.trim().startsWith("{"))try{const T=JSON.parse(b),R=T.token||T.accessToken||T.access_token||T.user_token||((i=T.user)==null?void 0:i.token);if(R&&typeof R=="string")return R}catch{}else if(typeof b=="string"&&b.length>20){let T=b;return T.startsWith("Bearer ")&&(T=T.substring(7)),T.startsWith('"')&&T.endsWith('"')&&(T=T.slice(1,-1)),T}}}const p=(l=document.cookie.split("; ").find(d=>d.startsWith("user_token=")||d.startsWith("token=")))==null?void 0:l.split("=")[1];if(p)return decodeURIComponent(p)}catch(p){console.warn("[BDS] Failed to search auth token in storage:",p)}return null}const m={config:{systemPrompt:"",systemPromptEntries:[],skills:[],memories:[],activeCharacter:null,mcpToolSchemas:[]},hasInjected:i=>o().includes(i),markInjected:i=>a(i),getInjectedEntries:i=>f(i),markEntryInjected:(i,l)=>c(i,l),getLastChar:i=>u()[i]||null,setLastChar:(i,l)=>s(i,l),currentSessionChar:null,activeCompletionRequests:0,isNextVoiceMessage:!1,authToken:h(),setAuthToken:function(i){i&&i!==this.authToken&&(this.authToken=i)}};if(window.__bdsNetworkPatched)return;window.__bdsNetworkPatched=!0,(function(){if(window.__BDS_CONFIG__)return;let i=0;const l=new Map;window.addEventListener("bds:debug-api-response",d=>{let S=d.detail;if(typeof S=="string")try{S=JSON.parse(S)}catch{return}const b=l.get(S.id);b&&(b(S.result),l.delete(S.id))});function p(d){return function(){const S=Array.from(arguments);return new Promise(b=>{const T=++i;l.set(T,b),window.dispatchEvent(new CustomEvent("bds:debug-api-request",{detail:JSON.stringify({id:T,method:d,args:S})}))})}}window.__BDS_CONFIG__={raw:p("getRaw"),getFlag:p("getFlag"),getConfig:p("getConfig"),applyRemote:p("applyRemote"),replaceRemote:p("replaceRemote"),resetToBuiltin:p("resetToBuiltin"),detectModel:p("detectModel"),toggleDebugPanel:p("toggleDebugPanel")}})(),window.addEventListener(e.configUpdate,i=>{let l=i&&i.detail?i.detail:{};if(typeof l=="string")try{l=JSON.parse(l)}catch(p){console.error("[BDS] Failed to parse configUpdate detail:",p)}m.config=H(l||{})}),window.addEventListener(e.deepResearchConfigUpdate,i=>{let l=i&&i.detail?i.detail:{};if(typeof l=="string")try{l=JSON.parse(l)}catch(p){console.error("[BDS] Failed to parse deepResearchConfigUpdate detail:",p)}m.config.deepResearch=v(l||{})}),window.addEventListener(e.markVoiceMessage,()=>{m.isNextVoiceMessage=!0}),window.addEventListener("bds:request-history-msgs",async i=>{let l=i&&i.detail?i.detail:{};if(typeof l=="string")try{l=JSON.parse(l)}catch{return}const p=l==null?void 0:l.sessionId;if(!p)return;const d=`${n}?chat_session_id=${encodeURIComponent(p)}`,S={"Content-Type":"application/json"};m.authToken&&(S.Authorization=`Bearer ${m.authToken}`);try{const b=await E(d,{method:"GET",headers:S,credentials:"include"});if(!b.ok){console.warn("[BDS] history_mgs fetch failed:",b.status);return}const T=await b.json();T.__bdsExplicit=!0,window.dispatchEvent(new CustomEvent("bds:history-msgs",{detail:JSON.stringify(T)}))}catch(b){console.warn("[BDS] history_msgs fetch error:",b)}}),x();const E=window.fetch.bind(window);xe(m,y,g,w),Ie(m,y,g,w);function x(){window.dispatchEvent(new CustomEvent(e.requestConfig))}function y(i){const l=String(i||"");return l.includes("/api/v0/chat/completion")||l.includes("/api/v0/chat/edit_message")||l.includes(t)||l.includes(n)}function k(i,l){const p={status:i,url:String(l||""),activeCompletionRequests:m.activeCompletionRequests,timestamp:Date.now()};window.dispatchEvent(new CustomEvent(e.networkState,{detail:JSON.stringify(p)}))}function g(i){m.activeCompletionRequests+=1,k("start",i)}function w(i){m.activeCompletionRequests=Math.max(0,m.activeCompletionRequests-1),k("end",i)}})()})();
