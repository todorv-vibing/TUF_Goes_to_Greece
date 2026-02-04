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
    const filePath = path.join(__dirname, '../Downloads/Greek-Founders-For-Real-Default-view-export-1770233524497.csv');
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

        const founder = {
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
            overall_weighted_score: parseNumber(row[20]),
            total_visits: parseNumber(row[29])
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

// Parse Harmonic Founders
function parseHarmonicFounders() {
    const filePath = path.join(__dirname, '../Downloads/Harmonic-Founders-for-Real-Default-view-export-1770233504484.csv');
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);

    console.log('Harmonic CSV headers:', rows[0]);

    const founders = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 5) continue;

        // Parse education JSON to extract readable text
        let education = '';
        try {
            const eduRaw = cleanValue(row[3]);
            if (eduRaw && eduRaw.startsWith('[')) {
                const eduArray = JSON.parse(eduRaw);
                education = eduArray.map(e => {
                    const parts = [];
                    if (e.degreeType) parts.push(e.degreeType);
                    if (e.fieldOfStudy) parts.push(e.fieldOfStudy);
                    if (e.institutionName) parts.push(`at ${e.institutionName}`);
                    return parts.join(' ');
                }).filter(e => e).slice(0, 2).join('; ');
            }
        } catch (e) {
            education = cleanValue(row[3])?.substring(0, 100) || '';
        }

        const founder = {
            full_name: cleanValue(row[0]),
            linkedin_url: cleanValue(row[1]),
            education: education,
            founder_score: parseNumber(row[5])
        };

        if (founder.full_name) {
            founders.push(founder);
        }
    }

    // Sort by founder score descending
    founders.sort((a, b) => {
        if (a.founder_score === null && b.founder_score === null) return 0;
        if (a.founder_score === null) return 1;
        if (b.founder_score === null) return -1;
        return b.founder_score - a.founder_score;
    });

    console.log(`Parsed ${founders.length} Harmonic founders`);
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
