// --- YOUR PROVIDED FUNCTIONS ---
const MEMBER_MAP = {
    SR: 'Saerom', HY: 'Hayoung', GY: 'Gyuri', JW: 'Jiwon', JS: 'Jisun',
    SY: 'Seoyeon', CY: 'Chaeyoung', NG: 'Nagyung', JH: 'Jiheon'
};

// --- Define the exact inline styles from the target snippet ---
const liStyle = `list-style-type:square;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;margin-left:7.5pt;`;
const pStyle = `line-height:1.6667;margin-top:4.5pt;margin-bottom:0pt;`;

// Base style for most spans
const baseSpanStyle = `font-size:11pt;font-family:Lato;color:#212121ff;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;`;

// Style for bolded spans (like the prefix)
const boldSpanStyle = baseSpanStyle.replace('font-weight:400', 'font-weight:700');

// Style for the link's inner span
const linkSpanStyle = `font-size:11pt;font-family:Lato;color:#000000ff;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;`;

// Style for the members span
const membersSpanStyle = `font-size:11pt;font-family:'Source Code Pro';color:#212121ff;background-color:rgba(0,0,0,0.059);font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;`;
// const membersSpanStyle = `span style="font-family:'docs-Source Code Pro',Arial;background-color:rgba(0,0,0,0.059);font-weight:400;`;

const formattedListStyle = `margin-top:0;margin-bottom:0;padding-inline-start:20px;`

function parseGoogleSheetHtml(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const rows = doc.querySelectorAll('tr');
    return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        return Array.from(cells).map(cell => {
            const links = cell.querySelectorAll('a');
            if (links.length > 0) {
                return Array.from(links).map(link => ({ text: link.textContent.trim(), url: link.href }));
            } else {
                return cell.textContent.trim();
            }
        });
    });
}

async function getHtmlFromClipboard() {
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            if (item.types.includes('text/html')) {
                const blob = await item.getType('text/html');
                return await blob.text();
            }
        }
        alert("No HTML content found on the clipboard.");
        return null;
    } catch (err) {
        console.error("Failed to read from clipboard:", err);
        alert("Could not read from clipboard.");
        return null;
    }
}

function shouldShowPrefix() {
    const checkbox = document.getElementById('showPrefixCheckbox');

    // Return the checkbox's state, or true if it can't be found (a safe default)
    return checkbox ? checkbox.checked : true;
}

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function parseTitleAndMembers(fullTitle) {
    const match = fullTitle.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (match) {
        return { name: match[1].trim(), initials: match[2].trim() };
    }
    return { name: fullTitle.trim(), initials: '' };
}

function joinWithAnd(arr) {
    if (arr.length === 0) return "";
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return arr.join(" & ");
    return arr.slice(0, -1).join(", ") + " & " + arr[arr.length - 1];
}

function splitTitle(text) {
    // If it starts with [ ... ], extract prefix + title
    const match = text.match(/^\[(.*?)\]\s*(.*)$/);

    if (match) {
        return {
            prefix: match[1],
            title: match[2]
        };
    }

    // No prefix → whole text is title
    return {
        prefix: null,
        title: text
    };
}

function formatRowData(rowData) {
    if (rowData.length < 9 || !rowData[1] && !rowData[2]) return '';

    const date = rowData[1] || '';
    const fullTitle = rowData[2] || 'Untitled';
    const officialLinks = Array.isArray(rowData[4]) ? rowData[4] : [];
    const yarrLinks = Array.isArray(rowData[5]) ? rowData[5] : [];
    const subLink = rowData[8];

    const hasSub = !(subLink.length === 0 || subLink === 'None');
    const sub_emoji = hasSub ? '✔️' : '❌';

    const { prefix, title } = splitTitle(fullTitle);

    const { name, initials } = parseTitleAndMembers(title);
    const escapedName = escapeHtml(name);

    let mainLink = null;
    let sourceLinksToProcess = [];

    if (subLink && Array.isArray(subLink) && subLink.length === 1) {
        mainLink = subLink[0];
        sourceLinksToProcess = [...officialLinks, ...yarrLinks];
    } else if (officialLinks.length === 1 && yarrLinks.length === 0) {
        mainLink = officialLinks[0];
        sourceLinksToProcess = [...yarrLinks];
    } else if (yarrLinks.length === 1 && officialLinks.length === 0) {
        mainLink = yarrLinks[0];
        sourceLinksToProcess = [...officialLinks];
    } else {
        sourceLinksToProcess = [...officialLinks, ...yarrLinks];
    }

    let membersPart = '';
    if (initials) {
        const formattedMembersArray = initials.split(/[\s,&]+/).filter(Boolean).map(init => MEMBER_MAP[init.trim()] || init.trim());
        const formattedMembers = joinWithAnd(formattedMembersArray);
        if (formattedMembers) {
            // membersPart = ` - <span class="member-names">${escapeHtml(formattedMembers)}</span>`;
            membersPart = ` - <span style="${membersSpanStyle}">${escapeHtml(formattedMembers)}</span>`;
        }
    }

    let prefixElement = ''
    if (shouldShowPrefix() && prefix) {
        prefixElement = `<span style="font-weight:700;">${escapeHtml(prefix)}</span> - `;
    }

    let titleElement = escapedName;
    if (mainLink != null) {
        titleElement = `<a href="${mainLink.url}" target="_blank">${escapedName}</a>`;
    }

    let separateLinksPart = '';
    if (sourceLinksToProcess.length > 0) {
        const linkParts = [];
        const ytSearchLinks = sourceLinksToProcess.filter(link => link.text === 'YouTube Search');
        const otherSourceLinks = sourceLinksToProcess.filter(link => link.text !== 'YouTube Search');

        if (otherSourceLinks.length > 0) {
            if (otherSourceLinks.length === 1 && ytSearchLinks.length === 0) {
                const link = otherSourceLinks[0];
                const text = mainLink != null ? 'Source' : link.text;
                linkParts.push(`<a href="${link.url}" target="_blank">${text}</a>`);
            } else {
                otherSourceLinks.forEach((link, index) => {
                    const text = mainLink != null ? `Source ${index + 1}` : link.text;
                    linkParts.push(`<a href="${link.url}" target="_blank">${text}</a>`);
                });
            }
        }

        ytSearchLinks.forEach(link => {
            linkParts.push(`<a href="${link.url}" target="_blank">${escapeHtml(link.text)}</a>`);
        });

        if (linkParts.length > 0) {
            separateLinksPart = ` - <span style="${linkSpanStyle}">${linkParts.join(' | ')}</span>`;
        }
    }
    return `${sub_emoji} ${escapeHtml(date)} . ${prefixElement}${titleElement}${separateLinksPart}${membersPart}`;
}

async function copyOutputToClipboard2() {
    const copyButton = document.getElementById('copyButton');

    try {
        const sheetHtml = await getHtmlFromClipboard();
        if (sheetHtml) {
            const parsedRows = parseGoogleSheetHtml(sheetHtml);

            // Step 1: Group rows by category
            const groupedRows = {};
            parsedRows.forEach(rowData => {
                if (rowData.length < 4 || !rowData[1] && !rowData[2]) return; // Skip invalid rows

                const category = rowData[3] || 'Uncategorized';
                if (!groupedRows[category]) {
                    groupedRows[category] = [];
                }
                groupedRows[category].push(rowData);
            });

            // Step 2: Build the final HTML with headers for each group
            const finalHtmlParts = [];
            for (const category in groupedRows) {
                // Add the category header
                // finalHtmlParts.push(`<h3 class="category-header">${escapeHtml(category)}</h3>`);

                // Format each row within the group
                const rowsForCategory = groupedRows[category];
                const formattedHtmlStrings = rowsForCategory.map(rowData => formatRowData(rowData)).filter(Boolean);

                // Add the list for the category
                if (formattedHtmlStrings.length > 0) {
                    // finalHtmlParts.push(`<ul style="${formattedListStyle}">${formattedHtmlStrings.join('')}</ul>`);
                    finalHtmlParts.push(`${formattedHtmlStrings.join('<br>')}`);
                }
            }

            if (finalHtmlParts.length > 0) {
                const htmlToCopy = finalHtmlParts.join('<br>');
                resultContainer.style.display = 'block';

                const textToCopy = finalHtmlParts.text;

                // The modern Clipboard API can write multiple formats.
                // We provide both HTML and plain text for maximum compatibility.
                const htmlBlob = new Blob([htmlToCopy], { type: 'text/html' });
                const textBlob = new Blob([htmlToCopy], { type: 'text/plain' });
                const clipboardItem = new ClipboardItem({
                    'text/html': htmlBlob,
                    'text/plain': textBlob,
                });

                await navigator.clipboard.write([clipboardItem]);

                // Provide user feedback that the copy was successful
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copied!';
                copyButton.disabled = true;
                setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.disabled = false;
                }, 2000); // Reset after 2 seconds
            } else {
                alert("Could not find any valid data rows to format.");
            }
        }
    } catch (err) {
        console.error('Failed to copy content: ', err);
        alert('Could not copy to clipboard. Your browser might not support this feature or you may need to grant permission.');
    }
}

// --- UPDATED MAIN LOGIC WITH GROUPING ---
const pasteButton = document.getElementById('pasteAndFormatButton');
const resultContainer = document.getElementById('resultContainer');
const outputElement = document.getElementById('output');
const copyButton = document.getElementById('copyButton');

// if (copyButton) {
//     copyButton.addEventListener('click', copyOutputToClipboard2);
// } else {
//     console.warn('The "Copy to Clipboard" button with id="copyButton" was not found in the HTML.');
// }

pasteButton.addEventListener('click', async () => {
    pasteButton.textContent = 'Processing...';
    pasteButton.disabled = true;
    resultContainer.style.display = 'none';

    try {
        const sheetHtml = await getHtmlFromClipboard();
        if (sheetHtml) {
            const parsedRows = parseGoogleSheetHtml(sheetHtml);

            // Step 1: Group rows by category
            const groupedRows = {};
            parsedRows.forEach(rowData => {
                if (rowData.length < 4 || !rowData[1] && !rowData[2]) return; // Skip invalid rows

                const category = rowData[3] || 'Uncategorized';
                if (!groupedRows[category]) {
                    groupedRows[category] = [];
                }
                groupedRows[category].push(rowData);
            });

            // Step 2: Build the final HTML with headers for each group
            const finalHtmlParts = [];
            for (const category in groupedRows) {
                // Add the category header
                finalHtmlParts.push(`<h3 class="category-header">${escapeHtml(category)}</h3>`);

                // Format each row within the group
                const rowsForCategory = groupedRows[category];
                const formattedHtmlStrings = rowsForCategory.map(rowData => formatRowData(rowData)).filter(Boolean);

                // Add the list for the category
                if (formattedHtmlStrings.length > 0) {
                    // finalHtmlParts.push(`<ul style="${formattedListStyle}">${formattedHtmlStrings.join('')}</ul>`);
                    finalHtmlParts.push(`${formattedHtmlStrings.join('<br>')}`);
                }
            }

            if (finalHtmlParts.length > 0) {
                outputElement.innerHTML = finalHtmlParts.join('');
                resultContainer.style.display = 'block';
            } else {
                alert("Could not find any valid data rows to format.");
            }
        }
    } catch (error) {
        console.error('An unexpected error occurred:', error);
        alert('An unexpected error occurred during processing.');
    } finally {
        pasteButton.textContent = 'Paste and Format';
        pasteButton.disabled = false;
    }
});