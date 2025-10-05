import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the login page
        page.goto("http://localhost:3000/login", wait_until="networkidle")

        # Fill in the credentials
        page.get_by_label("Email address").fill("admin@nexusprocure.com")
        page.get_by_label("Password").fill("password123")

        # Click the login button
        page.get_by_role("button", name="Sign in").click(force=True)

        # Wait for navigation to the dashboard
        page.wait_for_url("**/dashboard", timeout=10000)

        # Navigate to the settings page
        page.goto("http://localhost:3000/dashboard/settings", wait_until="networkidle")

        # Click on the "System" tab
        system_tab = page.get_by_role("button", name="System")
        expect(system_tab).to_be_visible()
        system_tab.click()

        # Verify that the "System Information" heading is visible
        expect(page.get_by_role("heading", name="System Information")).to_be_visible()

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/settings_system_tab.png")
        print("Screenshot of the System tab taken successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)