-- supabase/migrations/00_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create monitored_tokens table
CREATE TABLE IF NOT EXISTS public.monitored_tokens (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    address text UNIQUE NOT NULL,
    pair_address text NOT NULL,
    symbol text NOT NULL,
    name text NOT NULL,
    initial_price numeric NOT NULL,
    initial_market_cap numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    dev_wallet text NOT NULL,
    achievements numeric[] DEFAULT '{}',
    last_price numeric NOT NULL,
    last_market_cap numeric NOT NULL,
    last_updated timestamp with time zone DEFAULT now()
);

-- Create dev_wallets table
CREATE TABLE IF NOT EXISTS public.dev_wallets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    address text UNIQUE NOT NULL,
    tokens_created text[] DEFAULT '{}',
    last_token_time timestamp with time zone DEFAULT now(),
    total_tokens integer DEFAULT 0,
    is_blacklisted boolean DEFAULT false,
    first_seen_at timestamp with time zone DEFAULT now(),
    reputation_score integer DEFAULT 50
);

-- Create token_achievements table
CREATE TABLE IF NOT EXISTS public.token_achievements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address text NOT NULL REFERENCES public.monitored_tokens(address),
    multiplier numeric NOT NULL,
    achieved_at timestamp with time zone DEFAULT now(),
    price_at_achievement numeric NOT NULL,
    market_cap_at_achievement numeric NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_monitored_tokens_address ON public.monitored_tokens(address);
CREATE INDEX IF NOT EXISTS idx_monitored_tokens_dev_wallet ON public.monitored_tokens(dev_wallet);
CREATE INDEX IF NOT EXISTS idx_monitored_tokens_created_at ON public.monitored_tokens(created_at);
CREATE INDEX IF NOT EXISTS idx_dev_wallets_address ON public.dev_wallets(address);
CREATE INDEX IF NOT EXISTS idx_token_achievements_token_address ON public.token_achievements(token_address);

-- Enable Row Level Security (RLS)
ALTER TABLE public.monitored_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_achievements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" 
    ON public.monitored_tokens FOR SELECT 
    USING (true);

CREATE POLICY "Enable insert for service role" 
    ON public.monitored_tokens FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role" 
    ON public.monitored_tokens FOR UPDATE 
    USING (auth.role() = 'service_role');

CREATE POLICY "Enable read access for all users" 
    ON public.dev_wallets FOR SELECT 
    USING (true);

CREATE POLICY "Enable insert/update for service role" 
    ON public.dev_wallets FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Enable read access for all users" 
    ON public.token_achievements FOR SELECT 
    USING (true);

CREATE POLICY "Enable insert for service role" 
    ON public.token_achievements FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_updated on monitored_tokens
CREATE TRIGGER update_tokens_last_updated
    BEFORE UPDATE ON public.monitored_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.monitored_tokens IS 'Stores information about monitored tokens';
COMMENT ON COLUMN public.monitored_tokens.address IS 'Token contract address';
COMMENT ON COLUMN public.monitored_tokens.pair_address IS 'DEX pair address';
COMMENT ON COLUMN public.monitored_tokens.symbol IS 'Token symbol';
COMMENT ON COLUMN public.monitored_tokens.name IS 'Token name';
COMMENT ON COLUMN public.monitored_tokens.initial_price IS 'Initial token price at detection';
COMMENT ON COLUMN public.monitored_tokens.initial_market_cap IS 'Market cap at first detection';
COMMENT ON COLUMN public.monitored_tokens.dev_wallet IS 'Developer wallet address';
COMMENT ON COLUMN public.monitored_tokens.achievements IS 'Array of achievement multipliers reached';
COMMENT ON COLUMN public.monitored_tokens.last_price IS 'Most recent token price';
COMMENT ON COLUMN public.monitored_tokens.last_market_cap IS 'Most recent market cap';

COMMENT ON TABLE public.dev_wallets IS 'Stores information about developer wallets';
COMMENT ON COLUMN public.dev_wallets.address IS 'Developer wallet address';
COMMENT ON COLUMN public.dev_wallets.tokens_created IS 'Array of created token addresses';
COMMENT ON COLUMN public.dev_wallets.last_token_time IS 'Timestamp of most recent token creation';
COMMENT ON COLUMN public.dev_wallets.total_tokens IS 'Total number of tokens created';
COMMENT ON COLUMN public.dev_wallets.is_blacklisted IS 'Whether wallet is blacklisted';
COMMENT ON COLUMN public.dev_wallets.reputation_score IS 'Reputation score (0-100)';

COMMENT ON TABLE public.token_achievements IS 'Records of token achievement milestones';
COMMENT ON COLUMN public.token_achievements.token_address IS 'Token address that reached milestone';
COMMENT ON COLUMN public.token_achievements.multiplier IS 'Achievement multiplier value';
COMMENT ON COLUMN public.token_achievements.achieved_at IS 'When milestone was achieved';
COMMENT ON COLUMN public.token_achievements.price_at_achievement IS 'Token price at achievement';
COMMENT ON COLUMN public.token_achievements.market_cap_at_achievement IS 'Market cap at achievement';
