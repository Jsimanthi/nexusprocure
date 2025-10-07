import re
from playwright.sync_api import sync_playwright, Page, expect

def verify_top_spenders(page: Page):
    """
    This script verifies that the "Top Spenders" section on the analytics page
    is rendered correctly after logging in as an administrator.
    """
    # Define a handler to intercept and print the API response
    def handle_response(response):
        if "/api/analytics" in response.url:
            print(f"Intercepted API response from {response.url}:")
            try:
                print(response.json())
            except Exception as e:
                print(f"Could not parse JSON response: {e}")

    page.on("response", handle_response)

    # 1. Arrange: Go to the login page
    page.goto("http://localhost:3000/login")

    # 2. Act: Log in as an administrator
    page.get_by_label("Email address").fill("admin@nexusprocure.com")
    page.get_by_label("Password").fill("password123")
    page.get_by_role("button", name="Sign in").click()

    # 3. Assert: Wait for navigation to the dashboard
    expect(page).to_have_url(re.compile(".*dashboard"))

    # 4. Act: Navigate to the Analytics page
    page.get_by_role("link", name="Analytics").click()

    # 5. Assert: Wait for the analytics page to load by looking for its heading
    expect(page.get_by_role("heading", name="Analytics & Reporting")).to_be_visible()
    expect(page).to_have_url(re.compile(".*analytics"))

    top_spenders_heading = page.get_by_role("heading", name="Top Spenders")
    expect(top_spenders_heading).to_be_visible()

    # Scroll down to ensure the new section is visible in the screenshot
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(500) # Wait for scrolling to finish

    # 6. Screenshot: Capture the result for visual verification
    screenshot_path = "jules-scratch/verification/top-spenders-verification.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_top_spenders(page)
        browser.close()

if __name__ == "__main__":
    main()