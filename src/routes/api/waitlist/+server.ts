import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    // Forward the request to your Google Apps Script
    const response = await fetch('https://script.google.com/macros/s/AKfycbxzBUfekKLbgfgDRxaLMmy6f5g6ZSf2X5IXsjWpf7kO5JEt-Gv0LMgZsOSKAMDwqFLE3g/exec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      redirect: 'follow'
    });

    // Handle potential redirects which can occur if the script is not deployed correctly
    if (response.status === 302) {
      // This indicates a likely permission issue with the Google Apps Script.
      throw new Error('Google Apps Script redirected. Please check deployment permissions.');
    }

    if (!response.ok) {
      throw new Error(`Google Apps Script responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return json({ 
      success: true, 
      message: 'Successfully added to waitlist!',
      data 
    });

  } catch (error) {
    console.error('Error processing waitlist request:', error);
    return json({ 
      success: false, 
      error: 'Failed to join waitlist. Please try again.' 
    }, { status: 500 });
  }
};
