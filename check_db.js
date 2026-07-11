const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY in env. Env keys:", Object.keys(process.env));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Supabase URL:", supabaseUrl);
  // Attempt to select from profiles table
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error reading profiles table:", error);
  } else {
    console.log("Success reading profiles. Sample data keys:", data && data.length > 0 ? Object.keys(data[0]) : "Empty");
  }

  // Testing specific columns by selecting them directly
  console.log("Testing specific columns:");
  const testColumns = [
    'business_knowledge_raw',
    'business_knowledge_structured',
    'escalation_keywords',
    'auto_reply_level',
    'feedback_count',
    'conversation_examples'
  ];
  for (const col of testColumns) {
    const { data: testData, error: testErr } = await supabase
      .from('profiles')
      .select(col)
      .limit(1);
    if (testErr) {
      console.log(`Column "${col}" -> FAIL:`, testErr.message);
    } else {
      console.log(`Column "${col}" -> OK`);
    }
  }
}

checkSchema();
