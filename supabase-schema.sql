-- Supabase Schema for TUF Goes to Greece
-- Run this in Supabase SQL Editor to create the required tables

-- Greek Founders (LinkedIn scrape - product companies only)
CREATE TABLE IF NOT EXISTS greek_founders (
    id SERIAL PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    founder_name TEXT,
    company_linkedin_url TEXT,
    company_name TEXT,
    company_website TEXT,
    person_linkedin_url TEXT,
    company_type TEXT,
    founder_score DECIMAL(3,1),
    product_score DECIMAL(3,1),
    market_opportunity_score DECIMAL(3,1),
    overall_weighted_score DECIMAL(4,2),
    total_visits INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Harmonic Founders (founder-centric data)
CREATE TABLE IF NOT EXISTS harmonic_founders (
    id SERIAL PRIMARY KEY,
    full_name TEXT,
    linkedin_url TEXT,
    education TEXT,
    founder_score DECIMAL(3,1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Egg Accelerator Portfolio
CREATE TABLE IF NOT EXISTS egg_accelerator (
    id SERIAL PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    founder_name TEXT,
    company_linkedin_url TEXT,
    company_name TEXT,
    company_website TEXT,
    person_linkedin_url TEXT,
    company_type TEXT,
    founder_score DECIMAL(3,1),
    product_score DECIMAL(3,1),
    market_opportunity_score DECIMAL(3,1),
    overall_weighted_score DECIMAL(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE greek_founders ENABLE ROW LEVEL SECURITY;
ALTER TABLE harmonic_founders ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_accelerator ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous read access
CREATE POLICY "Allow anonymous read access" ON greek_founders FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access" ON harmonic_founders FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access" ON egg_accelerator FOR SELECT USING (true);

-- Create policies for anonymous insert (for data import)
CREATE POLICY "Allow anonymous insert" ON greek_founders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON harmonic_founders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON egg_accelerator FOR INSERT WITH CHECK (true);

-- Create policies for anonymous delete (for clearing data)
CREATE POLICY "Allow anonymous delete" ON greek_founders FOR DELETE USING (true);
CREATE POLICY "Allow anonymous delete" ON harmonic_founders FOR DELETE USING (true);
CREATE POLICY "Allow anonymous delete" ON egg_accelerator FOR DELETE USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_greek_founders_overall_score ON greek_founders(overall_weighted_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_harmonic_founders_score ON harmonic_founders(founder_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_egg_accelerator_overall_score ON egg_accelerator(overall_weighted_score DESC NULLS LAST);
