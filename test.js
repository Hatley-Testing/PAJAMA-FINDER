// test.js - calls your local Pajama Finder server

async function runTest() {
  const response = await fetch('http://localhost:3000/pajama-finder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: 'Family of 4, cold winters, loves Christmas, budget under 150',
      kits: [
        {
          handle: 'winter-wonderland-family-set',
          title: 'Winter Wonderland Family Set',
          description: 'Cozy flannel Christmas pajamas for the whole family.',
          product_titles: 'Women’s Red Top | Men’s Navy Top | Kids Pajama Set',
          url: 'https://hatley.com'
        },
        {
          handle: 'summer-beach-family-set',
          title: 'Summer Beach Family Set',
          description: 'Lightweight cotton pajamas with beach and ocean motifs.',
          product_titles: 'Women’s Tank | Men’s Tee | Kids Shorts Set',
          url: 'https://hatley.com'
        }
      ]
    })
  });

  const data = await response.json();
  console.log('Response from /pajama-finder:');
  console.log(JSON.stringify(data, null, 2));
}

runTest().catch(console.error);
