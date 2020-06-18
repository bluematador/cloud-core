import ua from 'universal-analytics';

export const property = 'UA-77720502-2';
export const visitor = ua(property);
export default visitor;

export const host = window.location.protocol + '//' + window.location.host;
visitor.pageview(window.location.pathname, host, "Cloud CORE").send()
