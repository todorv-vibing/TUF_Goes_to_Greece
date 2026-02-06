const fs = require('fs');
const path = require('path');

// Parse CSV with proper handling of quoted fields
function parseCSV(content) {
    const lines = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentLine += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
                currentLine += char;
            }
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (currentLine.trim()) {
                lines.push(currentLine);
            }
            currentLine = '';
            if (char === '\r' && nextChar === '\n') i++;
        } else {
            currentLine += char;
        }
    }
    if (currentLine.trim()) lines.push(currentLine);

    return lines.map(line => {
        const fields = [];
        let field = '';
        let inQuote = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (!inQuote) {
                    inQuote = true;
                } else if (nextChar === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuote = false;
                }
            } else if (char === ',' && !inQuote) {
                fields.push(field.trim());
                field = '';
            } else {
                field += char;
            }
        }
        fields.push(field.trim());
        return fields;
    });
}

// Clean string value
function cleanValue(val) {
    if (!val || val === 'null' || val === 'undefined' || val === '') return null;
    return val.replace(/^["']|["']$/g, '').trim();
}

// Parse number
function parseNumber(val) {
    if (!val || val === '' || val === 'null') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

// Parse Greek Founders (LinkedIn scrape) - filter for product_company only
function parseGreekFounders() {
    const filePath = path.join(__dirname, '../Downloads/Greek-Founders-For-Real-Default-view-export-1770300771199.csv');
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);
    const header = rows[0];

    console.log('Greek Founders CSV headers:', header.slice(0, 10));

    const founders = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 10) continue;

        // Based on the CSV structure we read earlier
        const companyType = cleanValue(row[7]); // Company Type column

        // Only include product companies
        if (companyType !== 'product_company') continue;

        const founderScore = parseNumber(row[12]);
        const productScore = parseNumber(row[18]);
        const marketScore = parseNumber(row[19]);
        const overallScore = parseNumber(row[20]);

        // Only include companies with complete ratings
        if (founderScore === null || productScore === null || marketScore === null || overallScore === null) continue;

        const founder = {
            first_name: cleanValue(row[1]),
            last_name: cleanValue(row[2]),
            founder_name: `${cleanValue(row[1]) || ''} ${cleanValue(row[2]) || ''}`.trim(),
            company_linkedin_url: cleanValue(row[3]),
            company_name: cleanValue(row[4]),
            company_website: cleanValue(row[5]),
            person_linkedin_url: cleanValue(row[6]),
            company_type: companyType,
            founder_score: founderScore,
            product_score: productScore,
            market_opportunity_score: marketScore,
            overall_weighted_score: overallScore
        };

        // Only add if has company name
        if (founder.company_name) {
            founders.push(founder);
        }
    }

    // Sort by overall score descending, nulls last
    founders.sort((a, b) => {
        if (a.overall_weighted_score === null && b.overall_weighted_score === null) return 0;
        if (a.overall_weighted_score === null) return 1;
        if (b.overall_weighted_score === null) return -1;
        return b.overall_weighted_score - a.overall_weighted_score;
    });

    console.log(`Parsed ${founders.length} Greek product companies`);
    fs.writeFileSync(
        path.join(__dirname, 'greek_founders.json'),
        JSON.stringify(founders, null, 2)
    );

    return founders;
}

// Parse Harmonic Founders - uses regex-based extraction for complex CSV
function parseHarmonicFounders() {
    const filePath = path.join(__dirname, '../Downloads/Harmonic-Greek-Founders-for-Real-Default-view-export-1770381254774.csv');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Split by lines that start with a quoted name and LinkedIn URL pattern
    // Each valid data row starts with "Name","https://linkedin.com/in/...
    const rowPattern = /^"([^"]+)","(https:\/\/linkedin\.com\/in\/[^"]+)".*?,(\d+)$/gm;

    const founders = [];
    let match;

    while ((match = rowPattern.exec(content)) !== null) {
        const fullName = match[1];
        const linkedinUrl = match[2];
        const founderScore = parseInt(match[3], 10);

        // Skip header row if matched
        if (fullName === 'Full Name') continue;

        // Try to extract education from the row
        let education = '';
        const rowStart = match.index;
        const rowEnd = content.indexOf('\n', rowStart);
        const rowContent = content.substring(rowStart, rowEnd > 0 ? rowEnd : undefined);

        // Look for education JSON array
        const eduMatch = rowContent.match(/"\[{""institutionName""[^"]*""([^"]+)""[^}]*""degreeType""[^"]*""([^"]+)""[^}]*""fieldOfStudy""[^"]*""([^"]*)""/);
        if (eduMatch) {
            const parts = [];
            if (eduMatch[2]) parts.push(eduMatch[2]); // degreeType
            if (eduMatch[3] && eduMatch[3] !== 'null') parts.push(eduMatch[3]); // fieldOfStudy
            if (eduMatch[1]) parts.push(`at ${eduMatch[1]}`); // institutionName
            education = parts.join(' ');
        }

        if (fullName && !isNaN(founderScore)) {
            founders.push({
                full_name: fullName,
                linkedin_url: linkedinUrl,
                education: education,
                founder_score: founderScore
            });
        }
    }

    console.log(`Parsed ${founders.length} Harmonic founders (regex method)`);

    // Sort by founder score descending
    founders.sort((a, b) => {
        if (a.founder_score === null && b.founder_score === null) return 0;
        if (a.founder_score === null) return 1;
        if (b.founder_score === null) return -1;
        return b.founder_score - a.founder_score;
    });

    fs.writeFileSync(
        path.join(__dirname, 'harmonic_founders.json'),
        JSON.stringify(founders, null, 2)
    );

    return founders;
}

// Parse Egg Accelerator
function parseEggAccelerator() {
    const filePath = path.join(__dirname, '../Downloads/egg-accelerator-Default-view-export-1770233703749.csv');
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);

    console.log('Egg Accelerator CSV headers:', rows[0]);

    const companies = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 10) continue;

        const companyType = cleanValue(row[7]);

        // Only include product companies
        if (companyType !== 'product_company') continue;

        const company = {
            first_name: cleanValue(row[1]),
            last_name: cleanValue(row[2]),
            founder_name: `${cleanValue(row[1]) || ''} ${cleanValue(row[2]) || ''}`.trim(),
            company_linkedin_url: cleanValue(row[3]),
            company_name: cleanValue(row[4]),
            company_website: cleanValue(row[5]),
            person_linkedin_url: cleanValue(row[6]),
            company_type: companyType,
            founder_score: parseNumber(row[12]),
            product_score: parseNumber(row[18]),
            market_opportunity_score: parseNumber(row[19]),
            overall_weighted_score: parseNumber(row[20])
        };

        if (company.company_name) {
            companies.push(company);
        }
    }

    // Sort by overall score descending
    companies.sort((a, b) => {
        if (a.overall_weighted_score === null && b.overall_weighted_score === null) return 0;
        if (a.overall_weighted_score === null) return 1;
        if (b.overall_weighted_score === null) return -1;
        return b.overall_weighted_score - a.overall_weighted_score;
    });

    console.log(`Parsed ${companies.length} Egg Accelerator product companies`);
    fs.writeFileSync(
        path.join(__dirname, 'egg_accelerator.json'),
        JSON.stringify(companies, null, 2)
    );

    return companies;
}

// Run all parsers
console.log('=== Parsing Greek Data Sources ===\n');

const greekFounders = parseGreekFounders();
console.log('');

const harmonicFounders = parseHarmonicFounders();
console.log('');

const eggCompanies = parseEggAccelerator();
console.log('');

console.log('=== Summary ===');
console.log(`Greek Product Companies: ${greekFounders.length}`);
console.log(`Harmonic Founders: ${harmonicFounders.length}`);
console.log(`Egg Accelerator: ${eggCompanies.length}`);
console.log('\nJSON files created successfully!');
