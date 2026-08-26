# Changelog Writing & Formatting Rule

When adding or updating entries in `docs/changelog.html`:

1. **User Summary (Main Section)**:
   - The primary bulleted list under `<article class="changelog-entry">` must be written in **plain, user-friendly English** focused on outcomes and benefits for moderators and community members.
   - **Do NOT** include code symbols, function signatures (e.g. `runMonthlyHighlights()`), raw variable names, CSS selectors, or deep technical jargon in the main section.

2. **Technical Details Dropdown**:
   - All code symbols, developer notes, function signatures, CSS selectors, build script commands (`npx tsc --noEmit`), and API internals must be placed exclusively inside the collapsible `<details class="tech-details">` dropdown.
   - Structure developer notes using standard `<h3>Added</h3>` and `<h3>Fixed</h3>` subheadings.

3. **HTML Structure & Styling**:
   - Strictly match the HTML structure of existing entries:
     ```html
     <article class="changelog-entry">
       <div class="changelog-head">
         <h2 id="vX-Y-Z">vX.Y.Z</h2>
         <span class="changelog-badge live">Released</span>
         <span class="changelog-date">MMM DD, YYYY</span>
       </div>
       <p><strong>High-Level Summary Title</strong></p>
       <ul>
         <li><strong>Feature/Fix Name:</strong> Plain English user benefit.</li>
       </ul>

       <details class="tech-details">
         <summary class="tech-summary">
           <span class="tech-summary-left">
             <svg class="tech-icon" ...></svg>
             Technical details &amp; developer notes
           </span>
           <svg class="tech-chevron" ...></svg>
         </summary>
         <div class="tech-content">
           <h3>Added</h3>
           <ul>...</ul>
           <h3>Fixed</h3>
           <ul>...</ul>
         </div>
       </details>
     </article>
     ```
