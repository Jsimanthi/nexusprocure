import re
from playwright.sync_api import sync_playwright, Page, expect

def verify_department_feature(page: Page):
    """
    This script verifies the new departmental spend tracking feature.
    It logs in as an admin, creates a new department, verifies it,
    and checks the new analytics widget.
    """
    # 1. Log in as Administrator
    page.goto("http://localhost:3000/login")
    page.get_by_label("Email").fill("admin@nexusprocure.com")
    page.get_by_label("Password").fill("password123")
    page.get_by_role("button", name="Log in").click()
    expect(page).to_have_url("http://localhost:3000/dashboard")

    # 2. Navigate to Departments page and verify it exists
    page.get_by_role("link", name="Departments").click()
    expect(page).to_have_url("http://localhost:3000/dashboard/departments")
    expect(page.get_by_role("heading", name="Department Management")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/01_departments_page.png")

    # 3. Create a new department
    page.get_by_role("link", name="Create Department").click()
    expect(page).to_have_url("http://localhost:3000/dashboard/departments/create")
    page.get_by_label("Department Name").fill("New Test Department")
    page.get_by_role("button", name="Create Department").click()
    expect(page).to_have_url("http://localhost:3000/dashboard/departments")
    expect(page.get_by_text("New Test Department")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/02_department_created.png")

    # 4. Verify new department appears in Create User form
    page.get_by_role("link", name="Users").click()
    page.get_by_role("link", name="Create User").click()
    expect(page.get_by_label("Department")).to_contain_text("New Test Department")
    page.screenshot(path="jules-scratch/verification/03_user_creation_form.png")

    # 5. Verify the new analytics widget
    page.get_by_role("link", name="Analytics").click()
    expect(page).to_have_url("http://localhost:3000/dashboard/analytics")
    expect(page.get_by_role("heading", name="Spend by Department")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/04_analytics_page.png")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_department_feature(page)
        browser.close()

if __name__ == "__main__":
    main()