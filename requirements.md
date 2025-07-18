# DFS-MVP Sales Dashboard - Current State & Future Requirements

## What We Have Now

The DFS-MVP project is a **sales analytics dashboard** that helps businesses analyze their sales performance. Here's what's currently working:

### Core Features
- **CSV Upload & Processing**: Upload sales data files and automatically parse them
- **Sales Analytics**: View units sold vs ordered, revenue trends, and key metrics
- **Interactive Filtering**: Filter by SKU, year, and month to drill down into specific data
- **Forecast Simulation**: Use ARIMA and statistical models to predict future sales
- **Price-Sales Correlation**: Analyze how pricing affects sales performance
- **Performance Metrics**: Track fill rates, production costs, and monthly averages

### Current Data Structure
The system works with CSV files containing:
- Product SKUs
- Order dates
- Ordered vs sold quantities
- Pricing and cost data
- Revenue calculations

## What We Want to Add: Product Review System

We want to enhance this sales dashboard by adding a **product review system** that lets users submit and analyze customer reviews alongside sales data. This will help understand how customer satisfaction affects sales performance.

### Key User Stories

**For Sales Managers:**
- When I view a product's sales data, I want to see customer reviews and ratings so I can understand customer satisfaction
- When I analyze sales trends, I want to correlate them with review ratings to see if customer feedback impacts sales
- When I filter sales data, I want to filter by review ratings to focus on high/low satisfaction products

**For Customer Service:**
- When I submit a review for a product, I want it to be saved and associated with the correct SKU
- When I view reviews, I want to see them in chronological order with the most recent first
- When I hover over a rating, I want to see the exact rating value

**For Data Analysis:**
- When I upload new sales data, I want existing reviews to be preserved for matching products
- When I run sales forecasts, I want review sentiment to be included as a factor
- When I export data, I want to include review information

### Technical Requirements

**Data Management:**
- Store reviews locally (no backend needed initially)
- Associate reviews with specific product SKUs
- Prevent duplicate reviews from the same user
- Validate review data (1-5 star ratings, required fields)

**User Interface:**
- Add review submission forms with star ratings
- Display review lists with statistics
- Show rating distributions and averages
- Integrate seamlessly with existing dashboard

**Performance:**
- Load reviews quickly (under 2 seconds)
- Handle up to 10,000 reviews per product
- Work smoothly on desktop and mobile

**Security:**
- Prevent XSS attacks in review text
- Validate all input data
- Maintain data integrity

### Integration Points

The review system should:
- Work with the existing React/Vite setup
- Use the same SKU-based filtering system
- Integrate with current sales charts and analytics
- Maintain the existing UI design patterns
- Not break any current functionality

### Success Metrics

We'll know the review system is working when:
- Users can submit reviews without technical issues
- Review data correlates meaningfully with sales trends
- The dashboard loads and filters reviews quickly
- The interface feels natural and integrated 