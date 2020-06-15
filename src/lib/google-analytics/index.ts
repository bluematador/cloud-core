import ua from 'universal-analytics';

export const property = 'UA-77720502-2';
export const visitor = ua(property);
export default visitor;

visitor.pageview(window.location.pathname).send()
