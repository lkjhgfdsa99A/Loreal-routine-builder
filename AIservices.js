// Cloudflare Worker endpoint for OpenAI API calls
const CLOUDFLARE_WORKER_URL = 'https://loreal-bot.morusup1.workers.dev/';

// Function to make OpenAI API calls via Cloudflare Worker
async function callOpenAI(messages, useWebSearch = false) {
  // If web search is requested, add web search context
  if (useWebSearch && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    const webSearchContext = await searchWebForProducts(lastMessage.content);
    
    // Add web search context to the conversation
    messages.push({
      role: "system",
      content: `Here's some current web information that might be helpful: ${webSearchContext}`
    });
  }
  
  const body = {
    model: useWebSearch ? 'gpt-4o' : 'gpt-4o-mini',
    messages: messages,
    max_tokens: 1000,
    temperature: 0.7
  };

  try {
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Cloudflare Worker API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Cloudflare Worker API:', error);
    throw error;
  }
}

// Function to search web for L'Oréal product information
async function searchWebForProducts(query) {
  // This is a placeholder for web search functionality
  // In a real implementation, you would use a web search API like Serper or similar
  const webSearchResults = `
    Based on current L'Oréal product information and beauty trends:
    
    🔍 Latest insights about ${query}:
    • L'Oréal continues to innovate with sustainable beauty solutions
    • Recent product launches focus on personalized skincare
    • Clinical studies show improved skin barrier function with ceramide-based products
    • Beauty experts recommend layering products from thinnest to thickest consistency
    
    💡 Current beauty trends:
    • Minimalist skincare routines are gaining popularity
    • Sustainable packaging is becoming a priority
    • Personalized beauty based on skin analysis is trending
    
    For the most current product information, visit loreal.com or consult with a beauty advisor.
  `;
  
  return webSearchResults;
} 